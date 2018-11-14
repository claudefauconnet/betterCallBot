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
            entry.synonyms.push(entry.name)
            entry.synonyms.forEach(function (synonym) {
                allSynonyms.push({concept: entry.name, synonym: synonym})
            })
        })
        var allconceptsInParagraphs = []
        async.eachSeries(allSynonyms, function (synEntry, callbackEachSynonym) {
                var payload = {
                    "query": {
                        "match_phrase": {
                            "text": {
                                "query": synEntry.synonym,
                                "slop": 3
                            }
                        }
                    }
                };
                elasticQuery.search("totalreferentiel3", payload, function (err, result) {
                    if (err)
                        return callbackEachSynonym(err);
                    result.forEach(function (entry) {
                        allconceptsInParagraphs.push({
                            elasticId: entry._id,
                            paragraphId: entry._source.paragraphId,
                            synonym: synEntry.synonym,
                            concept: synEntry.concept
                        })
                    })
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
                    if( allParagraphsWithConcepts[paragraph.elasticId].indexOf(paragraph.concept)<0)
                    allParagraphsWithConcepts[paragraph.elasticId].push(paragraph.concept)

                })


                //update index
                var elasticPayload = []
                for (var key in  allParagraphsWithConcepts) {

                    elasticPayload.push({ "update" :{_index: index, _type: type, _id: "" + key}})
                    elasticPayload.push({doc:{concepts: allParagraphsWithConcepts[key]}})
                }
             elasticQuery.execBulk(elasticPayload,function(err, result){
                 if(err)
                     return callback(err);
                 return callback(null,result)
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
            for (var i = nouns.length; i >= 0; i--) {
                var group = "";
                nouns.forEach(function (noun, index) {
                    if (index >= i)
                        return;
                    if (group != "")
                        group += " AND "
                    group += noun
                })
                // if (group.indexOf(" AND ") > -1)
                groups.push(group);
            }
            for (var i = 0; i < nouns.length; i++) {
                var group = "";
                nouns.forEach(function (noun, index) {
                    if (index <= i)
                        if (group != "")
                            group += " AND "
                    group += noun
                })
                //  if (group.indexOf(" AND ") > -1)
                groups.push(group);
            }

            return groups
        }

        var queryStrings = getCombinations();
        //  console.log(queryStrings.toString());
        // on cherche le concept avec le plus de mots ordonnés correspondant dans le thesaurus
        async.eachSeries(queryStrings, function (query, callbackEachQuery) {
                elasticQuery.searchInThesaurus("totalref_thesaurus", query, 20, function (err, result) {

                    //  elasticQuery.searchWithQueryString("totalref_thesaurus", query, ["text", "data.synonyms"], 20, function (err, result) {
                    if (err)
                        return callbackEachQuery("error" + err);
                    if (result.length == 0)
                        callbackEachQuery(null)
                    else
                        callbackEachQuery(result)


                })
            }, function (result) {
                if (!result)
                    return callback(null, []);
                if (result.indexOf("error") == 0)
                    return callback(result);

                var concepts = [];


                if (result.forEach)

                    result.forEach(function (line) {
                        concepts.push(line._source)
                    })
                return callback(null, concepts);
            }
        )


    }


}

if (false
) {

    corpusAnalyzer.getThesaurusConcepts("purpose,guide,good,technical,solution,equipment,Bad,Actors,<br>,revision,minimum,standard,requirement,msr,feature,".split(","), function (err, result) {
        //   corpusAnalyzer.getThesaurusConcepts("anti surge system failure".split(" "), function (err, result) {
        var x = 1
    })

}

if (true) {
    corpusAnalyzer.setConceptsInCorpusFromThesaurus("totalreferentiel3", "totalrefparagraphs");
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