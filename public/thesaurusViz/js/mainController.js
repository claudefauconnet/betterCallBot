
var mainController =(function(){
    var self={};

    self.loadNodes=function(id){
        elastic.query(id, function(err, result){
            if(err)
                return console.log(err);
           self.prepareNodes(result);


        })




    }

    self.prepareNodes=function(data){
        data.forEach(function(line){
            var x=line;

        })
    }


    return self;
})()