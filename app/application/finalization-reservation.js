'use strict';

class ReservationOwnershipLostError extends Error {
  constructor() {
    super('final reservation ownership lost');
    this.name = 'ReservationOwnershipLostError';
  }
}

async function commitReservation({
  activityKey,
  isAdmin,
  models,
  ownerToken,
  ownsReservation,
  reservation,
  reservationNow,
  studentId,
  teacherId,
}) {
  const update = {
    $set: {
      lockUntil: isAdmin ? reservationNow : new Date(),
      ownerToken: '',
      status: 'committed',
      updatedAt: new Date(),
    },
  };
  const filter = isAdmin
    ? { _id: reservation._id, ownerToken, status: 'processing' }
    : ownsReservation
      ? { activityId: activityKey, ownerToken, studentId, teacherId }
      : { activityId: activityKey, studentId, teacherId };
  const committed = await models.FinalReservation.updateOne(filter, update);
  if (committed.modifiedCount !== 1) {
    throw new ReservationOwnershipLostError();
  }
}

async function resolveOwnershipLoss({
  activityKey,
  isAdmin,
  models,
  studentId,
  teacherId,
}) {
  try {
    const [ reservation, final, choose ] = await Promise.all([
      models.FinalReservation.findOne({ activityId: activityKey, studentId }),
      models.Final.findOne({ activityId: activityKey, studentId }),
      isAdmin
        ? Promise.resolve(null)
        : models.Choose.findOne({ activityId: activityKey, studentId, teacherId }),
    ]);
    if (
      reservation?.status === 'committed'
      && reservation.teacherId === teacherId
      && final?.teacherId === teacherId
      && (isAdmin || choose?.isChose)
    ) {
      return {
        code: 200,
        msg: isAdmin ? '录取记录已由并发请求添加' : '该学生已录取',
        data: final,
      };
    }
  } catch {
    // 丢失 fencing ownership 后禁止再补偿共享记录；交给调用方刷新核对。
  }
  return { code: 409, msg: '录取操作已由另一请求接管，请刷新后核对状态' };
}

module.exports = {
  ReservationOwnershipLostError,
  commitReservation,
  resolveOwnershipLoss,
};
