var fs = require('fs');
var path = require('path');
var async = require('async')
var coreNlp = require("../nlp/coreNlp..js");
var elasticQuery = require("./elasticQuery..js");
var request = require('request');
var server = "http://localhost:9200"

var corpusAnalyzer = {

    extractAllTokens: function (docs, callback) {
        var tokenizedDocs = [];
        var allNounTokens = {};
        var allNumTokens = [];
        async.eachSeries(docs, function (doc, callbackEachDoc) {
            var text = doc.text + " " + doc.title;
            if (doc.table)
                text += " " + doc.table.replace(/<[^>]*>/, " ")
            //  var text = doc.Texte;//+ " "+doc.Title;

            coreNlp.extractTokens(text, function (err, tokens) {
                if (err) {
                    console.log(err)
                    return callback(err);

                }
                if (!tokens)
                    callbackEachDoc(null);
                else {


                    doc.numTokens = tokens.numValues;
                    if (!doc.numTokens)
                        doc.numTokens = [];

                    if (!doc.nounTokens)
                        doc.nounTokens = [];

                    if (!doc.concepts)
                        doc.concepts = [];

                    tokenizedDocs.push(doc);

                    var lemmas = [];
                    tokens.nouns.forEach(function (token) {
                        lemmas.push(token.lemma)
                    })
                    if (lemmas.length > 0) {
                        corpusAnalyzer.getThesaurusConcepts(lemmas, function (err, result) {

                            if (result.length > 0) {
                                console.log(lemmas.toString())
                                result.forEach(function (concept) {
                                    doc.concepts.push(concept);

                                })

                            }
                            else {
                                lemmas.forEach(function (noun) {
                                    if (doc.nounTokens.indexOf(noun) < 0)
                                        doc.nounTokens.push(noun);
                                })

                            }
                            callbackEachDoc()
                        })


                    }
                    else {
                        callbackEachDoc()
                    }
                }


            })
        }, function (err) {
            if (err)
                return callback(err)
            return callback(null, {tokenizedDocs: tokenizedDocs, allNounTokens: allNounTokens})

        })
    },

    setConceptsInCorpusFromThesaurus: function (index, type, callback) {
        var file = "D:\\Total\\docs\\nlp\\thesaurusRefTotal.json"
        var data = "" + fs.readFileSync(file);
        var thesaurus = JSON.parse(data);
        var allSynonyms = []
        thesaurus.forEach(function (entry) {
            /*  if(entry.name=="shaft") {*/

            entry.synonyms.push(entry.name)
            entry.synonyms.forEach(function (synonym) {
                allSynonyms.push({concept: entry.name, synonym: synonym})
            })
            // }
        })
        var allconceptsInParagraphs = []
        async.eachSeries(allSynonyms, function (synEntry, callbackEachSynonym) {
            //if(synEntry.synonym!="anti surge controller")
              // return  callbackEachSynonym();
                var payload = {};
                if (type == "totalrefparagraphs") {
                    var payload = {
                        "size": 5000,
                        "query": {
                            "match_phrase": {
                                "text": {
                                    "query": synEntry.synonym,
                                    "slop": 3
                                }
                            }
                        }
                    };
                }
                else if (type == "totalrefdocuments") {
                    var payload = {
                        "size": 5000,
                        "query": {
                            "match_phrase": {
                                "purposeAndScope": {
                                    "query": synEntry.synonym,
                                    "slop": 3
                                }
                            }
                        }
                    };
                }
                elasticQuery.search(index, payload, function (err, result) {
                    if (err)
                        return callbackEachSynonym(err);
                    if (result && result.forEach) {
                        result.forEach(function (entry) {
                            allconceptsInParagraphs.push({
                                elasticId: entry._id,
                                paragraphId: entry._source.paragraphId,
                                synonym: synEntry.synonym,
                                concept: synEntry.concept
                            })
                        })
                    }
                    callbackEachSynonym();

                })


            },
            function (err) {


                var xx = allconceptsInParagraphs
                var statements = [];
                var allParagraphsWithConcepts = {}
                allconceptsInParagraphs.forEach(function (paragraph) {
                    if (!allParagraphsWithConcepts[paragraph.elasticId])
                        allParagraphsWithConcepts[paragraph.elasticId] = [];
                    if (allParagraphsWithConcepts[paragraph.elasticId].indexOf(paragraph.concept) < 0)
                        allParagraphsWithConcepts[paragraph.elasticId].push(paragraph.concept)

                })


                //update index
                var elasticPayload = []
                for (var key in  allParagraphsWithConcepts) {
if(key=="_9259676")
    var x=3
                    elasticPayload.push({"update": {_index: index, _type: type, _id: "" + key}})
                    elasticPayload.push({doc: {concepts: allParagraphsWithConcepts[key]}})
                }
                elasticQuery.execBulk(elasticPayload, function (err, result) {
                    if (err)
                        return callback(err);
                    return callback(null, result)
                })

                /*   request({
                           url: server + "/_bulk",
                           method: 'POST',
                           encoding: null,
                           // headers: {'Content-Type': 'application/json',},
                           body: elasticPayload,
                       },
                       function (err, res) {
                           if (err)
                               callback(err)
                           return callback(null, res)
                       })*/

            })
    }


    ,


    getThesaurusConcepts: function (nouns, callback) {
        function getCombinations() {
            var queryStrings = [];
            var groups = [];
            for (var i = 0; i < nouns.length; i++) {
                for (var j = nouns.length; j >= 0; j--) {
                    var group = "";
                    nouns.forEach(function (noun, index) {
                        if (index >= j)
                            return;
                        if (index < i)
                            return;
                        if (group != "")
                            group += " "
                        group += noun
                    })
                    if (group != "")
                        groups.push(group);
                }
            }
            groups.sort(function(a,b){
                var aLength=a.split(" ").length;
                var bLength=b.split(" ").length;
               return bLength-aLength;



            })

            return groups;

        }

        var queryStrings = getCombinations();
        //  console.log(queryStrings.toString());
        // on cherche le concept avec le plus de mots ordonnés correspondant dans le thesaurus
        var allConcepts = [];
        var i = 0;
        var foundTokens = ""
        async.eachSeries(queryStrings, function (query, callbackEachQuery) {
            if (foundTokens.indexOf(query) > -1)
                return callbackEachQuery();
            console.log(foundTokens);
            if ((++i) >= 6)
                console.log(JSON.stringify(query,null,2));
            var nTokens = query.split(" ").length;
            var payload ={
                "size": 5000,
                "query": {
                    "match_phrase": {
                        "synonyms": {
                            "query": query,
                            "slop": nTokens
                        }
                    }
                }
            }

            var index = "totalref_thesaurus";
            request({
                    url: server + "/" + index + "/_search",
                    method: 'POST',
                    // headers: {'Content-Type': 'application/json',},
                    json: payload,
                },
                function (err, res) {

                    if (err)
                        return callbackEachQuery(err)
                    else if (res.body && res.body.errors && res.body.errors.length > 0) {
                        console.log(JSON.stringify(res.body.errors))
                        return callbackEachQuery(res.body.errors)
                    }
                    else
                        var json = res.body;

                    if (json.hits) {

                        if (json.hits.hits.length > 0) {
                            foundTokens += query + " ";
                            var concepts=[];
                            json.hits.hits.forEach(function(hit){
                                concepts.push(hit._source)
                            })
                            allConcepts.push({token: query, concepts: concepts});
                        }
                        return callbackEachQuery();
                    }
                    else
                        return callbackEachQuery();


                })


        }, function (err) {


            return callback(null, allConcepts);
        })


    }


}

if (false) {

    corpusAnalyzer.getThesaurusConcepts("response time anti surge".split(" "), function (err, result) {
        //   corpusAnalyzer.getThesaurusConcepts("anti surge system failure".split(" "), function (err, result) {
        var x = 1
    })

}

if (true) {
    corpusAnalyzer.setConceptsInCorpusFromThesaurus("totalreferentiel5", "totalrefparagraphs", function (err, result) {
        var x = result;
    });
}


if (false) {
    corpusAnalyzer.setConceptsInCorpusFromThesaurus("totalreferentieldocuments5", "totalrefdocuments", function (err, result) {
        var x = result;
    });
}

if (false) {

    /*  var file = "D:\\Total\\docs\\GM MEC Word\\documents\\test\\elasticAllParagraphs.json";
      var file = "D:\\Total\\docs\\GM MEC Word\\documents\\elasticAllParagraphs.json";
      var data = "" + fs.readFileSync(file);
      var docs = JSON.parse(data);*/


    corpusAnalyzer.extractAllTokens(docs, function (err, result) {
        fs.writeFileSync("D:\\Total\\docs\\nlp\\allNounTokens.json", JSON.stringify(result.allNounTokens, null, 2))
        fs.writeFileSync("D:\\Total\\docs\\nlp\\tokenizedDocs.json", JSON.stringify(result.tokenizedDocs, null, 2))
        //   thesaurus.getWordsConcepts(result.allNounTokens,"totalRef")

    });


}

module.exports = corpusAnalyzer;