var elastic = (function () {
    var self = {}
    var souslesensUrl = "http://localhost:3002"
    self.elasticParams = {
        size: 500,
        index: "ingenieur",
        elasticUrl: "http://127.0.0.1:9200/"
    }
    self.currentIndex;

    self.queryIds = function (field,ids, callback) {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }


        var payloadElastic = {
            "size": self.elasticParams.size,
            "from": "0",

            "query": {
                "bool": {
                    "must": [
                        {"terms": {}},
                    ]
                }
            }

        }
        payloadElastic.query.bool.must[0].terms[field] = ids

        console.log(JSON.stringify(payloadElastic, null, 2))
        var payload = {
            post: 1,
            url: self.elasticParams.elasticUrl + self.currentIndex + "/",
            path: "_search",
            body: JSON.stringify(payloadElastic)
        }
        self.query(payload,callback)
    }


    self.queryMatch = function (field,word, callback) {

        var payloadElastic = {
            "size": self.elasticParams.size,
            "from": "0",

            "query": {
                "bool": {
                    "must": [
                        {"match": {}},
                    ]
                }
            }

        }
        payloadElastic.query.bool.must[0].match[field] = word

        console.log(JSON.stringify(payloadElastic, null, 2))
        var payload = {
            post: 1,
            url: self.elasticParams.elasticUrl + self.currentIndex + "/",
            path: "_search",
            body: JSON.stringify(payloadElastic)
        }
        self.query(payload,callback)
    }

self.query=function(payload,callback){
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