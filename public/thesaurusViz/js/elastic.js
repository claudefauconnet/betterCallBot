var elastic = (function () {
    var self = {}
    var souslesensUrl = "http://localhost:3002"
    self.elasticParams = {
        size: 5000,
        index: "ingenieur",
        elasticUrl: "http://127.0.0.1:9200/ingenieur/"
    }

    self.query = function (ids, callback) {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        var payloadElastic =  {



            "from": "0",

            "query": {
                "bool": {
                    "must": [
                        {
                            "terms" : {
                                "id" : [407]
                            }

                        }
                    ]
                }
            }


        }

        console.log(JSON.stringify(payloadElastic,null,2))
        var payload={
            post:1,
            url:self.elasticParams.elasticUrl,
            path:"_search",
            body:JSON.stringify(payloadElastic)
        }


        $.ajax({
            type: "POST",
            url: "../http",
            data: payload,
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                data=data.hits.hits;
               var  resultArray=[];
               data.forEach(function(line){
                   resultArray.push(line._source)
               })
                callback(null,resultArray )


            }, error: function (err) {
                callback(err);

            }
        })


    }


    return self;
})()