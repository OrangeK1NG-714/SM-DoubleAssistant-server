module.exports = app => {
  const mongoose = app.mongoose;
  mongoose.pluralize(null);
  const Schema = mongoose.Schema;
  const FinalReservationSchema = new Schema({
    activityId: { type: String, required: true },
    studentId: { type: String, required: true },
    teacherId: { type: String, required: true },
    ownerToken: { type: String, default: '' },
    lockUntil: { type: Date },
    status: {
      type: String,
      enum: [ 'processing', 'committed' ],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }, { versionKey: false });
  FinalReservationSchema.index({ studentId: 1, activityId: 1 }, { unique: true });
  return mongoose.model('FinalReservation', FinalReservationSchema);
};
