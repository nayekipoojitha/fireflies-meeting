const mongoose=require('mongoose');
const MeetingSchema=new mongoose.Schema({title:{type:String,required:true},date:{type:Date,default:Date.now},duration:{type:Number,default:30},participants:[String],summary:String,topics:[{title:String,timestamp:Number}],createdAt:{type:Date,default:Date.now}});
module.exports=mongoose.model('Meeting',MeetingSchema);
