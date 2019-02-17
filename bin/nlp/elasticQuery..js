var request = require('request');
var async=require("async");
var elasticsearch=require('elasticsearch');

var server = "http://localhost:9200";
var elasticFethSize=500;
var elasticQuery = {


    searchInThesaurus: function (index, value, size, callback) {
        var payload = {
            "size": size,
            "query": {
                "bool": {
                    "should": [
                        {
                            "term": {
                                "synonyms": {
                                    "value": value,
                                }
                            }
                        },
                        {
                            "term": {
                                "name": {
                                    "value": value,
                                }
                            }
                        }
                    ]
                }
            }
        };
        elasticQuery.search( index, payload, function (err, result) {
            if (err)
                return callback(err);
            return callback(null, result);

        })

    },

    searchWithQueryString: function (index, term, fields, size, callback) {
        var payload = {
            "size": size,
            "query": {"query_string": {"query": term}}
        }
        if (fields)
            fields.forEach(function (field, index) {
                if (index == 0)
                    payload.query.query_string.query = "";
                else
                    payload.query.query_string.query += " OR "

                payload.query.query_string.query += field + ":" + term
            })
console.log(JSON.stringify(payload,null,2))
        elasticQuery.search(index, payload, function (err, result) {
            if (err)
                return callback(err);
            return callback(null, result);

        })

    },




    searchAll:function(index,size,callback){

      var payload = {
          "size": size,
          "query": {
              "match_all": {}

          }
      }
          elasticQuery.search(index, payload, function (err, result) {
          if (err)
              return callback(err);
          return callback(null, result);

      })

    },

    search: function (index, payload, callback) {
        request({
                url: server + "/" + index + "/_search",
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                json: payload,
            },
            function (err, res) {

                if (err)
                    return callback(err)
                else if (res.body && res.body.errors && res.body.errors.length > 0) {
                    console.log(JSON.stringify(res.body.errors))
                    return callback(res.body.errors)
                }
                else
                    var json = res.body;
                if(!json instanceof Object)
                    json=JSON.parse(json)
                var result = [];
                if (json.hits)
                    result = json.hits.hits;
                else
                    return callback(null, []);

                return callback(null, result);

            })
    },
    execBulk:function(payload,callback){
        var client=new elasticsearch.Client({
            host: server,

            log: ['error', 'warning']
        });
        client.bulk({
            body: payload
        }, function (err, resp) {
            if (err) {
                console.log("ERROR " + err)
                //  console.log(JSON.stringify(elasticPayload, null, 2))
                return callback(null);

            } else if (resp.errors) {
                resp.items.forEach(function (item, index) {
                    if (item.index.result != "created") {
                        console.log(JSON.stringify(payload[index]))
                        console.log(JSON.stringify(item))
                    }
                })
                return callback(resp.errors);
            } else {
                return callback(null,resp);
            }
        });

    },

   getClient:function() {

    return new elasticsearch.Client({
        host: server,
        log: (['error']),
        //  log: ['error', 'warning']
    });
}

    ,  /**
     *
     * @param indexName
     * @param type
     * @param _array
     * @param options id_attr attr to use as elasticId else if not set use randomId
     * @param callback
     */
    indexJsonArray: function (indexName, type, _array, options, callback) {
        if (!options)
            options = {};
        var array = _array;
        var elasticPayload = [];
        var startId = Math.round(Math.random() * 100000000);
        var partitions = [];
        var index = 0;

        var subArray = [];
        for (var i = 0; i < array.length; i++) {


            subArray.push(array[i]);
            if (subArray.length >=elasticFethSize) {
                partitions.push(subArray);
                subArray = [];
            }
        }
        partitions.push(subArray);


        var partitionIndex = 0;
        var result = [];
        var id = null;
        async.eachSeries(partitions, function (array, callbackSeries) {

                elasticPayload = [];
                for (var i = 0; i < array.length; i++) {

                    id = startId++;


                    elasticPayload.push({index: {_index: indexName, _type: type, _id: "_" + id}})
                    // var payload = {"content": array[i]};
                    var payload = array[i]
                    elasticPayload.push(payload);
                }


                elasticQuery.getClient().bulk({
                    body: elasticPayload
                }, function (err, resp) {
                    if (err) {
                        console.log("ERROR " + err)
                        console.log(JSON.stringify(elasticPayload, null, 2))
                        return callbackSeries(err)

                    } else {
                        if (resp.errors) {
                            resp.items.forEach(function (item, index) {
                                if (item.index.result != "created") {
                                    console.log(JSON.stringify(array[index]))
                                    console.log(JSON.stringify(item))
                                }
                            })
                            return callback(resp.errors);
                        }
                        console.log("partition " + (partitionIndex++))
                        result.push(resp)


                        return callbackSeries(null);

                    }
                });
            },
            function (err) {
                if (err)
                    return callback(err);
                callback(null, result);

            }
        )
    }
    ,
    indexCsv: function (csvPath, elasticIndex, elasticType, callback) {


        var data = "" + fs.readFileSync(csvPath);
        var elasticFields = elasticProxy.getShemasFieldNames(elasticIndex, elasticType);
        var elasticFieldsMap = null;
        if (elasticProxy.getIndexMappings(elasticIndex, elasticType).fields)
            elasticFieldsMap = elasticProxy.getIndexMappings(elasticIndex, elasticType).fields.fieldObjs;
        var jsonData = [];
        csv({noheader: false, trim: true, delimiter: "auto"})
            .fromString(data)
            .on('json', function (json) {
                jsonData.push(json);

            })
            .on('done', function () {
                var startId = Math.round(Math.random() * 10000000);
                var elasticPayload = [];
                // contcat all fields values in content field

                for (var i = 0; i < jsonData.length; i++) {
                    for (var key in jsonData[i])
                        if (elasticFields.indexOf(key) < 0)
                            elasticFields.push(key);
                }

                for (var i = 0; i < jsonData.length; i++) {
                    var payload = {};
                    var content = "";
                    var contentValue = ""

                    elasticPayload.push({index: {_index: elasticIndex, _type: elasticType, _id: "_" + (startId++)}})
                    for (var j = 0; j < jsonData.length; j++) {
                        var key = elasticFields[j];
                        var value = jsonData[i][key];
                        if (!value)
                            continue;
                        if (value == "0000-00-00")
                            continue;
                        if (true || elasticFieldsMap && elasticFieldsMap[key].isSearched)
                            contentValue += ". " + value;

                        payload[key] = value;
                        if (true)
                            x = 1

                    }

                    if (contentValue.length > 0)
                        payload["content"] = contentValue;
                    elasticPayload.push(payload);

                }

                elasticQuery.getClient().bulk({
                    body: elasticPayload
                }, function (err, resp) {
                    if (err) {
                        console.log("ERROR " + err)
                        //  console.log(JSON.stringify(elasticPayload, null, 2))
                        return callback(err);
                    } else if (resp.errors) {
                        resp.items.forEach(function (item, index) {
                            if (item.index.result != "created") {
                                console.log(JSON.stringify(jsonData[index]))
                                console.log(JSON.stringify(item))
                            }
                        })
                        return callback(resp.errors);
                    } else {
                        return callback(null, "done");
                    }
                });


            });


    }

}






module.exports = elasticQuery;

if (false) {
    elasticQuery.searchWithQueryString("totalreferentiel3", "a", 5, function (err, result) {
        var xx = err;
    })
}