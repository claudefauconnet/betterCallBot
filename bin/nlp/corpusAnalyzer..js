var fs = require('fs');
var path = require('path');
var async = require('async')
var coreNlp = require("../nlp/coreNlp..js");
var elasticQuery = require("./elasticQuery..js");


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
                if(err){
                    console.log(err)
                    return callback(err);

                }
if (!tokens)
    callbackEachDoc(null);
              else   {
                    var nouns = tokens.nouns;
                    var numValues = tokens.numValues;


                    doc.numTokens = tokens.numValues;
                    doc.nounTokens = [];
                    if (!doc.numTokens)
                        doc.numTokens = [];

                    tokenizedDocs.push(doc);
   corpusAnalyzer.getThesaurusConcepts(tokens.nouns,function(err,result) {
       if (result.concepts && result.concepts.length > 0) {
           result.concepts.forEach(function (concept) {
               doc.nounTokens.push(concept);
               allNounTokens[result.noun].concepts.push(thesaurusEntry._source)
           })

       }
       else {
           doc.nounTokens.push(result.noun);
       }
   })




                 /*   async.eachSeries(tokens.nouns, function (token, callbackEachToken) {
                        // tokens.nouns.forEach(function(token){
                        var lemma = token.lemma.toLocaleLowerCase();
                        if (lemma.length > 3 && lemma.indexOf("<") < 0) {


                            doc.nounTokens.push(lemma);
                            if (!allNounTokens[lemma] ) {
                                var obj = {term: lemma, concepts: []}
                                allNounTokens[lemma]=obj;
                                elasticQuery.findInElasticThesaurus(lemma, "totalref_thesaurus", function (err, result) {
                                    if(result && result.forEach) {
                                        result.forEach(function (thesaurusEntry) {
                                            allNounTokens[lemma].concepts.push(thesaurusEntry._source)
                                        })
                                    }


                                });

                            }

                        }
                        callbackEachToken(null);
                    }, function (err) {
                         callbackEachDoc();


                    })*/


                }


            })
        }, function (err) {
                if (err)
                    return callback(err)
                return callback(null, {tokenizedDocs: tokenizedDocs, allNounTokens: allNounTokens})

            } )
    },


    getThesaurusConcepts:function(nouns){

        var queryStrings=[];
        var groups=[];
        for(var i=nouns.length;i>=0;i--) {
            var group=[];
            nouns.forEach(function (noun,index) {
                if (index >= i)
                    return;
                group.push(noun)
            })
            console.log(group.toString())

        }
        for(var i=0;i<nouns.length;i++) {
            var group=[];
            nouns.forEach(function (noun,index) {
                if (index <=i)
                    return;
                group.push(noun)
            })
            console.log(group.toString())

        }
      //  console.log(group.toString())
        groups.push.apply(groups,group)





    }


}

if(true){
    corpusAnalyzer.getThesaurusConcepts("anti surge system failure".split(" "))

}


if (false) {

    var file = "D:\\Total\\docs\\GM MEC Word\\documents\\test\\elasticAllParagraphs.json";
    var file = "D:\\Total\\docs\\GM MEC Word\\documents\\elasticAllParagraphs.json";
    var data = "" + fs.readFileSync(file);
    var docs = JSON.parse(data);
    graphBuilder.extractAllTokens(docs, function (err, result) {
        fs.writeFileSync("D:\\Total\\docs\\nlp\\allNounTokens.json",JSON.stringify(result.allNounTokens, null, 2))
        fs.writeFileSync("D:\\Total\\docs\\nlp\\tokenizedDocs.json",JSON.stringify(result.tokenizedDocs, null, 2))
        //   thesaurus.getWordsConcepts(result.allNounTokens,"totalRef")

    });

}

module.exports = corpusAnalyzer;