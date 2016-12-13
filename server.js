var express = require('express'),
    app = express(),
    google = require('googleapis'),
    customsearch = google.customsearch('v1'),
    port = process.env.PORT;
    
//DB
var mongodb = require('mongodb').MongoClient,
    dbUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/imgsearch";
    
var API_KEY = "AIzaSyAsZ_ozCZLd6J_dq8DvKifCniTKRhqEZic",
    CX = "010337252347492493134:9stuhnd3lsw";

/* Search for images */
app.get('/api/search', (req, res) => {
    
    if(req.query !== undefined && req.query.t !== undefined){
        
        var offset = req.query.offset || 1,
            term = req.query.t,
            ts = new Date(Date.now());
        
        customsearch.cse.list({ cx: CX, q: term, auth: API_KEY, searchType: "image", start : offset }, function(err, resp) {
            if (err) {
                console.error('An error occured', err);
                return res.json({ error: err.message });
            }
        
            // Got the response from custom search
            console.log('Result: ' + resp.searchInformation.formattedTotalResults);
            var result = [];
        
            if (resp.items && resp.items.length > 0) {
                var l = resp.items.length;
                console.log('# of results: ' + l); // this is always 10
        
                console.log('Results:', resp.items);
                for(var i=0; i<l; i++){
                    console.log('Result # ' + (i+1) + ': ', resp.items[i]);
                    result.push({ url: resp.items[i].link, snippet: resp.items[i].snippet, thumbnail: resp.items[i].image.thumbnailLink, context: resp.items[i].image.contextLink });
                }
                
                res.json(result);
            }
            
            //connect to db
            mongodb.connect(dbUrl, (err, db) => {
                if(err) return console.error(err);
                console.log("Connected to " + dbUrl);
                //save in log
                var queries = db.collection('queries');
                queries.insert({ term: term, ts: ts.toISOString() }, (err, entry) => {
                  if(err) { console.error(err); return res.json({error : err.message});} 
                  db.close();
                });
            });
            
        });     
    }else{
        return res.json({ error: "a query string must be provied." });
    }
    
});

/* Last 10 queries */
app.get('/api/latest', (req, res) => {
    //query last 10 requested terms 
    mongodb.connect(dbUrl, (err, db) => {
        if(err) return console.error(err);
        console.log("Connected to " + dbUrl);
        //save in log
        var queries = db.collection('queries');
        queries.find({}).sort({ ts : -1 }).limit(10).toArray((err, items) => {
            if(err) { console.error(err); return res.json({error : err.message}); }
            var result = [];
            if(items.length > 0){
                result = items.map((item) => {
                    return { term : item.term, date : item.ts };
                });
            }
            res.json(result);
            db.close(); 
        });
    });
});

/* Home Page */
app.get('/', (req, res) => {
    var url = req.protocol + "://" + req.hostname + "/api/";
    var html = "<h2>Image Search Abstraction Layer</h2>"
            +   "<p>Perform a search with as the following example:</p>"
            +   "<code>" + url + "search?t=&lt;MY TERM&gt;&offset=&lt;MY PAGE&gt;</code>"
            +   "<p>To get last 10 queries:</p>"
            +   "<code>" + url + "latest</code>";
    res.send(html);
});
    
app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});