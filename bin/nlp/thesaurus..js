var skos = require("./skos..js");
var fs = require('fs');
var request = require("request");
var thesaurus = {
    elasticUrl: "http://localhost:9200/totalref_thesaurus/_search?",


    thesaurusTrees: {},


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
                    var json =JSON.parse(res.body);
var result="{}"
                if (json.hits )
                    result=json.hits.hits;

                    return callback(null,result );

            })

    }


    , getWordsConcepts: function (words, thesaurusName, callback) {

        words.forEach(function (word) {
            var xx = thesaurus.findInElasticThesaurus(word, "totalref_thesaurus");
        })


    }


}

if (false) {

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
    skos.loadSkosToTree("totalRef", function (err, result) {

        fs.writeFileSync("d:\\thesaurusRefTotal.json", JSON.stringify(result, null, 2))
    })
}


module.exports = thesaurus