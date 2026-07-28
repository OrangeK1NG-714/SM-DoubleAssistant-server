'use strict';

const crypto = require('node:crypto');
const { isDuplicateKeyError } = require('./selection-security');

const TEACHER_LOCK_MS = 15 * 1000;

async function acquireTeacherLock(models, activityId, teacherId, now = new Date()) {
  const ownerToken = crypto.randomUUID();
  const lockUntil = new Date(now.getTime() + TEACHER_LOCK_MS);
  try {
    await models.TeacherOperationLock.create({
      activityId,
      lockUntil,
      ownerToken,
      teacherId,
    });
    return ownerToken;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
  const existing = await models.TeacherOperationLock.findOne({
    activityId,
    teacherId,
  });
  if (!existing || new Date(existing.lockUntil) > now) {
    return null;
  }
  const reclaimed = await models.TeacherOperationLock.findOneAndUpdate(
    { _id: existing._id, lockUntil: existing.lockUntil },
    { $set: { lockUntil, ownerToken } },
    { new: true }
  );
  return reclaimed ? ownerToken : null;
}

async function releaseTeacherLock(models, activityId, teacherId, ownerToken) {
  await models.TeacherOperationLock.deleteOne({
    activityId,
    ownerToken,
    teacherId,
  });
}

module.exports = {
  acquireTeacherLock,
  releaseTeacherLock,
};
