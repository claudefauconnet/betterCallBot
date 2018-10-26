
var fs=require('fs');
var path=require('path');

var docxBot={
getCards:function(callback) {
   var filePath = "D:\\Total\\docs\\GM MEC Word\\documents\\botContent.json"
//filePath = "D:\\Total\\docs\\GM MEC Word\\documents\\test\\botContent.json"
    var str=""+fs.readFileSync(filePath);
    var json=JSON.parse(str);
    return callback(null,json);


}


}
module.exports=docxBot;