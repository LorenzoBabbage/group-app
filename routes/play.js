var ConnectSdk = require('connectsdk');

module.exports = function(app, client){

  function apiCall(cb){
    //On the vuw lab machines, node can't make external calls for some reason...
    //I emailed Aaron Chen about it.  Until it's fixed...
    //Set to true to use hardcoded image list instead of calling the API
    onLabsSoStubOutAPI = false; 
    if(onLabsSoStubOutAPI){
      imgs = [];
      for(var i=0; i<30; i++) {
        imgs.push({"display_sizes":[{"uri":"http://cache4.asset-cache.net/xt/83454805.jpg?v=1&g=fs1|0|DV|54|805&s=1&b=MkUw"}],"title":"Puppy with oversized bone dog"});
      }
      cb(null,{"images":imgs});
  
    } else{
      sdk = new ConnectSdk("56bdt8yjqf64774m5a2yfuz4","a34kr22MJEDem4edRSqwfzpJfq8UXUx296yBWgcr5u9RA")
              .search()
              .images()
              .creative()
              .withExcludeNudity()
              .withPage(1)
              .withPageSize(100)
              .withPhrase('single object')
              .execute(cb);
    }
  }
  
  function absent(el, array){
    return array.indexOf(el)==-1;
  }
  
  function randomChoices(list, num){
    var random_indices = [];
    while (random_indices.length < num){
      var ran = Math.floor(Math.random()*list.length);
      if (absent(ran, random_indices))
        random_indices.push(ran);
    }
    return random_indices.map(function(i){return list[i];});
  }
  //Takes parameters 'difficulty' and 'num_images'.
  //Returns {'data': [{'img':url,'word':word}]}
  app.get('/play', function(request, response) {
    apiCall(function(err,res){
      if(err) response.send(err);
  
      images = randomChoices(res.images, 10);
  
      var titleWords = [];
      images.forEach(function(img){
        img.title = img.title.toLowerCase().split(" ");
        titleWords = titleWords.concat(img.title);
      })
  
      //Make a list of unique words over all titles
      titleWords = titleWords.filter(function(w,i,l){return w != '' && l.indexOf(w) === i;})
  
      var params = titleWords.map(function(w,i){return '$'+(i+1);});
      var words = {};
  
      var query = client.query('SELECT word,nounorverb FROM words WHERE word IN (' + params.join(',') + ')',titleWords);
      query.on('row',function(w){words[w.word] = w.nounorverb;});
      query.on('end',function(){
  
        images.forEach(function(img){
          img.nouns = img.title.filter(function(w){return words[w] == 'n';});
        });
  
        images = images.filter(function(img){return img.nouns.length > 0;});
  
        image_mapper = function(img){
          return {'img':img.display_sizes[0].uri, 'word':img.nouns[0]};
        }
        data_to_send = {'data': randomChoices(images,3).map(image_mapper)};
  
        response.header('Content-Length',data_to_send.data.length);
        response.send(data_to_send);
  
      });
    });
  });
  
//Takes parameter 'score' where score equals the number to increase the users score by
//calculated based on difficulty, time taken etc.
//Returns the updated score
app.post('/updatescore', function(request, response){
	var newScore;	
	var query = client.query('UPDATE users '+
                      'SET score = score + $1 '+
                      'WHERE user_id = $2 RETURNING score', [request.score, request.user.user_id]);
	query.on('row', function(row) {
		newScore = row.score;
	});
	query.on('end', function() {
		response.send(newScore);
	});
});

}
