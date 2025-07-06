//创建活动表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const ActivitySchema = new Schema({
        name: { type: String, required: true },
        description: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    }, { versionKey: false });
    return mongoose.model('Activity', ActivitySchema);
}   