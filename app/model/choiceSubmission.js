module.exports = app => {
  const mongoose = app.mongoose;
  mongoose.pluralize(null);
  const Schema = mongoose.Schema;
  const ChoiceSubmissionSchema = new Schema({
    activityId: { type: String, required: true },
    studentId: { type: String, required: true },
    fingerprint: { type: String, required: true },
    choices: {
      type: [{
        teacherId: { type: String, required: true },
        order: { type: Number, required: true },
        _id: false,
      }],
      required: true,
    },
    subscribeStatus: { type: String, default: '' },
    status: {
      type: String,
      enum: [ 'processing', 'committed', 'failed' ],
      required: true,
    },
    ownerToken: { type: String, default: '' },
    lockUntil: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }, { versionKey: false });
  ChoiceSubmissionSchema.index({ studentId: 1, activityId: 1 }, { unique: true });
  return mongoose.model('ChoiceSubmission', ChoiceSubmissionSchema);
};
