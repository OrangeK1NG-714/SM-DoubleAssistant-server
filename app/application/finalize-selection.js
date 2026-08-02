'use strict';

const { isDuplicateKeyError, isWithinWindow, teacherWindow } =
  require('../lib/selection-security');
const { acquireTeacherLock, releaseTeacherLock } = require('../lib/selection-lock');
const { rollbackFinalization } = require('./finalization-compensation');
const {
  ReservationOwnershipLostError,
  commitReservation,
  resolveOwnershipLoss,
} = require('./finalization-reservation');

const FINAL_RESERVATION_MS = 30 * 1000;
const FINALIZATION_POLICIES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
});

const isAdminPolicy = policy => policy === FINALIZATION_POLICIES.ADMIN;

function assertPolicy(policy) {
  if (!Object.values(FINALIZATION_POLICIES).includes(policy)) {
    throw new TypeError('unsupported finalization policy');
  }
}

async function getAdminSelection(models, activityId, studentId, teacherId) {
  const activityKey = String(activityId);
  const [ activity, student, studentMembership, teacherMembership, existingFinal ] =
    await Promise.all([
      models.Activity.findById(activityId),
      models.Student.findOne({ studentId }),
      models.UserInActivity.findOne({ activityId: activityKey, studentId }),
      models.UserInActivity.findOne({ activityId: activityKey, teacherId }),
      models.Final.findOne({ activityId: activityKey, studentId }),
    ]);
  if (!activity) {
    return { error: { code: 404, msg: '活动不存在' } };
  }
  if (!student || !studentMembership || !teacherMembership) {
    return { error: { code: 400, msg: '导师或学生不属于此活动' } };
  }
  if (existingFinal) {
    return { error: { code: 409, msg: '该学生在此活动中已有录取记录' } };
  }
  return {
    activityKey,
    existingFinal,
    student,
    teacherMembership,
  };
}

async function getTeacherSelection(models, activityId, studentId, teacherId) {
  const activityKey = String(activityId);
  const [ activity, teacherMembership, studentMembership, choose, student ] =
    await Promise.all([
      models.Activity.findById(activityId),
      models.UserInActivity.findOne({ activityId: activityKey, teacherId }),
      models.UserInActivity.findOne({ activityId: activityKey, studentId }),
      models.Choose.findOne({ activityId: activityKey, studentId, teacherId }),
      models.Student.findOne({ studentId }),
    ]);
  if (!activity) {
    return { error: { code: 404, msg: '活动不存在' } };
  }
  if (!teacherMembership || !studentMembership) {
    return { error: { code: 403, msg: '导师或学生不属于此活动' } };
  }
  if (!choose || !student) {
    return { error: { code: 404, msg: '学生未向该导师提交志愿' } };
  }
  const window = teacherWindow(activity, Number(choose.order));
  if (!isWithinWindow(new Date(), window)) {
    return { error: { code: 400, msg: `当前不在第${choose.order}志愿选择时间内` } };
  }
  return {
    activityKey,
    choose,
    student,
    teacherMembership,
  };
}

async function reserveStudent({
  activityKey,
  models,
  ownerToken,
  policy,
  studentId,
  teacherId,
}) {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + FINAL_RESERVATION_MS);
  let reservation;
  let ownsReservation = false;
  try {
    reservation = await models.FinalReservation.create({
      activityId: activityKey,
      lockUntil,
      ownerToken,
      status: 'processing',
      studentId,
      teacherId,
      updatedAt: now,
    });
    ownsReservation = true;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    reservation = await models.FinalReservation.findOne({
      activityId: activityKey,
      studentId,
    });
  }

  if (isAdminPolicy(policy)) {
    if (!ownsReservation) {
      if (!reservation || reservation.status === 'committed') {
        return { error: { code: 409, msg: '该学生在此活动中已有录取记录' } };
      }
      if (!reservation.lockUntil || new Date(reservation.lockUntil) > now) {
        return { error: { code: 409, msg: '该学生录取正在处理中，请稍后重试' } };
      }
      reservation = await models.FinalReservation.findOneAndUpdate(
        {
          _id: reservation._id,
          lockUntil: reservation.lockUntil,
          status: 'processing',
        },
        {
          $set: {
            lockUntil,
            ownerToken,
            teacherId,
            updatedAt: now,
          },
        },
        { new: true }
      );
      ownsReservation = Boolean(reservation);
      if (!ownsReservation) {
        return { error: { code: 409, msg: '该学生录取正在处理中，请稍后重试' } };
      }
    }
    return { ownsReservation, reservation, reservationNow: now };
  }

  if (
    reservation
    && reservation.status === 'processing'
    && (
      !reservation.lockUntil
      || new Date(reservation.lockUntil) <= now
    )
  ) {
    reservation = await models.FinalReservation.findOneAndUpdate(
      {
        _id: reservation._id,
        lockUntil: reservation.lockUntil,
        status: 'processing',
      },
      {
        $set: {
          lockUntil,
          ownerToken,
          teacherId,
          updatedAt: now,
        },
      },
      { new: true }
    );
    ownsReservation = Boolean(reservation);
  }
  if (!reservation || reservation.teacherId !== teacherId) {
    return { error: { code: 409, msg: '该学生已被其他导师录取' } };
  }
  if (reservation.status === 'processing' && !ownsReservation) {
    return { error: { code: 409, msg: '该学生录取正在处理中，请稍后重试' } };
  }
  return { ownsReservation, reservation, reservationNow: now };
}

async function finalizeLocked({
  models,
  ownerToken,
  policy,
  selection,
  studentId,
  teacherId,
}) {
  const { activityKey, choose, student, teacherMembership } = selection;
  let createdFinal = false;
  let ownsReservation = false;
  let chooseWasUpdated = false;
  let reservation;
  let reservationNow;
  try {
    let existingFinal = selection.existingFinal;
    if (!isAdminPolicy(policy)) {
      existingFinal = await models.Final.findOne({
        activityId: activityKey,
        studentId,
      });
      if (existingFinal && existingFinal.teacherId !== teacherId) {
        return { code: 409, msg: '该学生已被其他导师录取' };
      }
    }

    if (!existingFinal) {
      const quota = Number(teacherMembership.maxSelectNum);
      if (!Number.isInteger(quota) || quota < 1) {
        return { code: 409, msg: '导师名额尚未配置' };
      }
      const selectedCount = await models.Final.countDocuments({
        activityId: activityKey,
        teacherId,
      });
      if (selectedCount >= quota) {
        return { code: 409, msg: '已达到最大选择人数限制' };
      }
    }

    const reservationResult = await reserveStudent({
      activityKey,
      models,
      ownerToken,
      policy,
      studentId,
      teacherId,
    });
    if (reservationResult.error) {
      return reservationResult.error;
    }
    ({ ownsReservation, reservation, reservationNow } = reservationResult);

    if (!existingFinal) {
      existingFinal = await models.Final.create({
        activityId: activityKey,
        data: student.data || {},
        order: isAdminPolicy(policy) ? 0 : choose.order,
        studentId,
        teacherId,
      });
      createdFinal = true;
    }
    if (!isAdminPolicy(policy)) {
      const updatedChoose = await models.Choose.findOneAndUpdate(
        { activityId: activityKey, studentId, teacherId },
        { $set: { isChose: true } },
        { new: true }
      );
      if (!updatedChoose) {
        throw new Error('choice disappeared during final selection');
      }
      chooseWasUpdated = true;
    }
    await commitReservation({
      activityKey,
      isAdmin: isAdminPolicy(policy),
      models,
      ownerToken,
      ownsReservation,
      reservation,
      reservationNow,
      studentId,
      teacherId,
    });
    if (isAdminPolicy(policy)) {
      return { code: 201, msg: '录取记录添加成功' };
    }
    return {
      code: createdFinal ? 201 : 200,
      msg: createdFinal ? '老师已选学生' : '该学生已录取',
      data: existingFinal,
    };
  } catch (error) {
    if (error instanceof ReservationOwnershipLostError) {
      return resolveOwnershipLoss({
        activityKey,
        isAdmin: isAdminPolicy(policy),
        models,
        studentId,
        teacherId,
      });
    }
    await rollbackFinalization({
      activityKey,
      cause: error,
      chooseWasUpdated,
      createdFinal,
      isAdmin: isAdminPolicy(policy),
      models,
      originalChooseIsChose: Boolean(choose?.isChose),
      ownerToken,
      ownsReservation,
      reservation,
      studentId,
      teacherId,
    });
    throw error;
  }
}

async function finalizeSelection({
  activityId,
  logger,
  models,
  policy,
  studentId,
  teacherId,
}) {
  assertPolicy(policy);
  let selection;
  if (!isAdminPolicy(policy)) {
    selection = await getTeacherSelection(
      models,
      activityId,
      studentId,
      teacherId
    );
    if (selection.error) {
      return selection.error;
    }
  }

  const activityKey = String(activityId);
  const ownerToken = await acquireTeacherLock(models, activityKey, teacherId);
  if (!ownerToken) {
    const msg = isAdminPolicy(policy)
      ? '导师录取操作正在处理中，请稍后重试'
      : '导师选择正在处理中，请稍后重试';
    return { code: 409, msg };
  }

  try {
    if (isAdminPolicy(policy)) {
      selection = await getAdminSelection(
        models,
        activityId,
        studentId,
        teacherId
      );
      if (selection.error) {
        return selection.error;
      }
    }
    return await finalizeLocked({
      models,
      ownerToken,
      policy,
      selection,
      studentId,
      teacherId,
    });
  } catch (error) {
    if (isAdminPolicy(policy)) {
      throw error;
    }
    logger.error('selectStudentAndUpdate failed:', error);
    return {
      code: 500,
      msg: error instanceof AggregateError
        ? '录取失败，部分状态未能自动回滚，请联系管理员核对'
        : '录取失败，操作已回滚',
    };
  } finally {
    await releaseTeacherLock(
      models,
      activityKey,
      teacherId,
      ownerToken
    ).catch(error => {
      logger.error(
        isAdminPolicy(policy)
          ? 'release admin final lock failed:'
          : 'release teacher selection lock failed:',
        error
      );
    });
  }
}

module.exports = { FINALIZATION_POLICIES, finalizeSelection };
