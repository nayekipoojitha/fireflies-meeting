const mongoose=require('mongoose');
const TranscriptSchema=new mongoose.Schema({meetingId:{type:mongoose.Schema.Types.ObjectId,ref:'Meeting',required:true},speaker:String,timestamp:Number,text:String});
module.exports=mongoose.model('Transcript',TranscriptSchema);
