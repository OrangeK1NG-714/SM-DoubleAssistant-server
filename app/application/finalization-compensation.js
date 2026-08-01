'use strict';

async function attempt(operation, errors) {
  try {
    await operation();
  } catch (error) {
    errors.push(error);
  }
}

async function rollbackFinalization({
  activityKey,
  cause,
  chooseWasUpdated,
  createdFinal,
  isAdmin,
  models,
  originalChooseIsChose,
  ownerToken,
  ownsReservation,
  reservation,
  studentId,
  teacherId,
}) {
  const errors = [];
  if (chooseWasUpdated) {
    await attempt(
      () => models.Choose.findOneAndUpdate(
        { activityId: activityKey, studentId, teacherId },
        { $set: { isChose: originalChooseIsChose } },
        { new: true }
      ),
      errors
    );
  }
  if (createdFinal) {
    await attempt(
      () => models.Final.deleteOne({ activityId: activityKey, studentId, teacherId }),
      errors
    );
  }
  if (ownsReservation) {
    await attempt(
      () => models.FinalReservation.deleteOne(
        isAdmin
          ? { _id: reservation._id, ownerToken }
          : { activityId: activityKey, ownerToken, studentId, teacherId }
      ),
      errors
    );
  }
  if (errors.length > 0) {
    throw new AggregateError(
      [ cause, ...errors ],
      'final selection compensation incomplete',
      { cause }
    );
  }
}

module.exports = { rollbackFinalization };
