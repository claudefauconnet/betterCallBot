/**
 * Represents a book.
 * @constructor
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 */

var graphBuilder=(function(){

    var self={};

    /**
     * Represents a book.
     * @constructor
     * @param {string} title - The title of the book.
     * @param {string} author - The author of the book.
     */


    self.extractAllTokens=function(docs){


        async.eachSeries(docs, function (doc, callbackEachDoc) {
        var text = doc.text + " " + doc.title;
        if (doc.table)
            text += " " + doc.table.replace(/<[^>]*>/, " ")
        //  var text = doc.Texte;//+ " "+doc.Title;

        coreNlp.analyzeTexts("all", [["", "", text]], "tokens", function (err, analyze) {

            if (analyze && analyze.length > 0) {
                var nouns = analyze[0].tokens.nouns;
                var numValues= analyze[0].tokens.numValues;

                doc.nounTokens=analyze[0].tokens.nouns;
                doc.numTokens=analyze[0].tokens.numValues;
                if(!doc.nounTokens)
                    doc.nounTokens=[];

                if(!doc.numTokens)
                    doc.numTokens=[];

                tokenizedDocs.push(doc);
                /*  else
                      console.log("no word in thesaurus " + doc.id)*/

            }

            return callbackEachDoc();
        })







    })
    }


    return self;
})();