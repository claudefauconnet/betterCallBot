var skos = require("./skos..js");
var fs = require('fs');
var request = require("request");
var async = require('async');
var thesaurus = {
    elasticUrl: "http://localhost:9200/totalref_thesaurus/_search?",



    mappings:{
        index: "totalRefThesaurus2",
        type: "concept",
        body: {
            mappings: {
                concept: {
                    properties: {
                        name: { type: "keyword" },
                        parents: { type: "text" },
                        synonyms: {type: "keyword" },

                    }
                }
            }
        }
    },








    buildElasticThesaurus: function () {
        async.series([
            //transform skos toJson
            function(callback){
                skos.loadSkosToTree("totalRef", function (err, result) {
                    var xx = result;
                    var thesaurus = [];
                    result.forEach(function (entry) {

                        var ancestors = entry.parent.substring(entry.parent.indexOf("#") + 1).split("-")
                        ancestors.forEach(function(ancestor, indice){
                            ancestors[indice]=ancestor.toLowerCase()
                        })
                        var synonyms = [];
                        entry.data.synonyms.forEach(function (entry) {
                            synonyms.push(entry.toLowerCase())
                        })
                        thesaurus.push({name: entry.text.toLowerCase(), synonyms: synonyms, ancestors: ancestors});

                    })

                    fs.writeFileSync("D:\\Total\\docs\\nlp\\thesaurusRefTotal.json", JSON.stringify(thesaurus, null, 2))
                    callback(null);
                })
            },
            function (callback) {
                if (false) {
                    var str = "" + fs.readFileSync("D:\\Total\\docs\\nlp\\thesaurusRefTotal.json")
                    var json = JSON.parse(str);
                    elasticProxy.indexJsonArray("totalref_thesaurus2", "concept", json, {}, function (err, result) {
                        var x = result;
                        callback(null);
                    })


                }
            }
            ],function(err){
            console.log("done")

        })


    },


    getWordConceptsInThesaurus: function (word, thesaurusTree) {

        if (word.charAt(word.length - 1) == 's')
            word = word.substring(0, word.length - 1)
        //  console.log(word)
        var concepts = [];
        var pseudoConcepts = [];
        var uniqueConcepts = [];
        var uniquePseudoConcepts = [];
        for (var key in thesaurusTree) {
            var conceptName = key.substring(8);
            var treeConcept = treeData[key].text;

            if (treeConcept) {
                if (treeConcept.toLowerCase() == word.toLowerCase()) {
                    concepts.push({name: conceptName, type: "concept"});
                }
                else if (treeConcept.toLowerCase().indexOf(word.toLowerCase()) > -1) {
                    pseudoConcepts.push({name: conceptName, type: "concept"})
                }

                treeData[key].data.synonyms.forEach(function (synonym) {

                    if (synonym.toLowerCase() == word.toLowerCase()) {
                        if (uniqueConcepts.indexOf(conceptName) < 0) {
                            uniqueConcepts.push(conceptName)
                            concepts.push({name: conceptName, type: "synonym"});
                        }
                    }
                    else if (synonym.toLowerCase().indexOf(word.toLowerCase()) > -1) {
                        if (uniquePseudoConcepts.indexOf(conceptName) < 0) {
                            uniquePseudoConcepts.push(conceptName)
                            pseudoConcepts.push({name: conceptName, type: "synonym"});
                        }

                    }
                })


            }
        }
        return {concepts: concepts, pseudoConcepts: pseudoConcepts};

    },


    findInElasticThesaurus: function (word, thesaurusName, callback) {

        var queryString = encodeURIComponent("properties={\"annotators\":\"tokenize,ssplit,lemma,pos\",\"outputFormat\":\"json\"}");


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
                    var json = JSON.parse(res.body);
                var result = "{}"
                if (json.hits)
                    result = json.hits.hits;

                return callback(null, result);

            })

    }


    , getWordsConcepts: function (words, thesaurusName, callback) {

        words.forEach(function (word) {
            var xx = thesaurus.findInElasticThesaurus(word, "totalref_thesaurus");
        })


    }


}

if (true) {
thesaurus.buildElasticThesaurus();
    // https://www.monterail.com/blog/how-to-index-objects-elasticsearch
    /*
    {"mappings": {
  "thesaurus": {
    "properties": {
      "text": { "type": "text" },
        "type": { "type": "keyword" },
      "data": {
        "type": "nested",
        "properties": {
          "parentText": { "type": "text" },
          "synonyms": { "type": "nested"}
        }
      }
    }
  }
}

}
     */

}


module.exports = thesaurus