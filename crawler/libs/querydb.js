var mongoose = require('mongoose'),  
mongoose.connect('mongodb://git.fugle.tw:27017/trySthSth');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    pttCrawler.find({'comment' : {'express' : sign}}, function(err) {
       if (err){
       	return console.error(err);
      } 
      mongoose.connection.close();
      console.log("8+9=17");
    });

};

