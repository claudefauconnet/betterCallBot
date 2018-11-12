
var request=require('request');
var server="http://localhost:9200"


var elasticQuery = {
    searchWithQueryString: function (index, term, fields,size,callback) {
        var payload = {"size":size,
            "query": { "query_string": { "query": term } }
        }
        if(fields)
          fields.forEach(function(field, index){
              if(index ==0)
                  payload.query.query_string.query="";
              else
                  payload.query.query_string.query+=" OR "

              payload.query.query_string.query=field+":"+term
          })

            //payload.query.query_string.default_field=field;


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
                    var json =res.body;
                var result = "{}"
                if (json.hits)
                    result = json.hits.hits;

                return callback(null, result);

            })
    }
}


module.exports = elasticQuery;

if(false) {
    elasticQuery.searchWithQueryString("totalreferentiel3", "a", 5, function (err, result) {
        var xx = err;
    })
}