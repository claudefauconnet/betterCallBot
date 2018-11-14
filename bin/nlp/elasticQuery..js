var request = require('request');

var elasticsearch = require('elasticsearch');


var server = "http://localhost:9200";
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

                payload.query.query_string.query = field + ":" + term
            })

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
                // headers: {'Content-Type': 'application/json',},
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
                var result = "{}"
                if (json.hits)
                    result = json.hits.hits;

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

            } else {
                return callback(null);
            }
        });

    }

}


module.exports = elasticQuery;

if (false) {
    elasticQuery.searchWithQueryString("totalreferentiel3", "a", 5, function (err, result) {
        var xx = err;
    })
}