var fs=require('fs');
var request=require('request');

var controlledVocabulary={


    getTokens: function(index,text){


        request({
                url: thesaurus.elasticUrl + "q=" + word,
                method: 'GET',
                headers: {'Content-Type': 'application/json',}
            },
            function (err, res) {

                if (err)
                    callback(err)
                else if (res.body && res.body.errors && res.body.errors.length > 0) {
                    console.log(JSON.stringify(res.body.errors))
                    callback(res.body.errors)
                }
                else
                    var json =JSON.parse(res.body);
                var result="{}"
                if (json.hits )
                    result=json.hits.hits;

                return callback(null,result );

            })

    }



    }




}

module.exports=controlledVocabulary