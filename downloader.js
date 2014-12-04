/* *******************************************
 *
 * モジュールロード
 * 
******************************************* */
var http = require('http');
var request = require('request');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
//var domain = require('domain');
var cheerio = require('cheerio');
var argv = require('argv');


/* *******************************************
 *
 * 初期設定
 * 
******************************************* */
var charlist = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

//イベント・ドリブン
var ev = new EventEmitter;

// URLを指定 
var thetaURL = 'https://theta360.com';

//JPG, MP4振り分け
var ext = {
  "equirectangular": ".jpg",
  "video.mp4": ".mp4"
};

//THETA ID = 100 is INDEX = 3844
var index = 0; 
var maxIndex = 0;

//ファイル名のプレフィックス。おそらく / でディレクトリが指定可能
var prefix = "";

/* *******************************************
 *
 * メソッド定義
 * 
******************************************* */
//通し番号からTHETA公式用IDに変換
function index2thetaId(num){
  var trg = parseInt(num);
  var len = charlist.length;
  var mods = [];
  while( trg >= len ){
    var n = trg % len;
    mods.push(charlist[n]);

    trg = (trg - n) / len;
    //console.log(n, "("+trg+")");
  }
  mods.push( charlist[trg] );
  //console.log( mods );
  return mods.reverse().join("");
}

function thetaId2index(thetaId){
  var ary = thetaId.split("");
  ary.reverse();
  var sum = 0;
  for( var i = 0; i < ary.length; i++){
    var position = charlist.indexOf( ary[i] );
    if( position == -1 ){
      return -1;
    }
    sum += position * Math.pow(charlist.length, i);
  }
  return sum;
}

//THETA公式ページのURLを生成
function createURL(id){
  var url;
  if( ops.legacy ){
    url = thetaURL + "/spheres/" + id;
  }else{
    url = thetaURL + "/s/" + id;
  }

  return url;
}

function checkExistFile( jpg, mp4 ){
  var existJpg = fs.existsSync( jpg );
  var existMp4 = fs.existsSync( mp4 );
  //console.log("exist", existJpg, existMp4);
  return !(existJpg || existMp4);
}

function genFileName( idNum, ext, legacy){
  var fn;
  if( legacy ){
    fn = prefix + "legacy_" + idNum + ext;
  }else{
    var thetaId = index2thetaId( idNum );
    fn = prefix + idNum + "_" + thetaId + ext;
  }
  return fn;

}

function pageRequest( idNum, url ){
  var thetaId = index2thetaId( idNum );
  var jpg = genFileName( idNum, ".jpg", ops.legacy );
  var mp4 = genFileName( idNum, ".mp4", ops.legacy );
  if( checkExistFile( jpg, mp4 ) ){
    request( url, function(error, response, body){
      if(!error && response.statusCode == 200){
        var $ = cheerio.load(body);
        var $urlText = $("#urlText");
        var imageURL = $urlText.val().replace(/https/, "http");
        var type = $urlText.attr("name");
        var filename = genFileName( idNum, ext[type], ops.legacy );

        console.log("image url : ", imageURL);

        download( filename , imageURL);
      }else if(!error && response.statusCode == 302){
        var redirectURL = response.Location;
        pageRequest( idNum, redirectURL );
      }else{
        console.error("ERROR", response.statusMessage);
        ev.emit("done");
      }
    });
  }else{
    console.log("File is exist", idNum + "_" + thetaId);
    ev.emit("done");
  }
}



//ファイルを実際にダウンロードする処理
function download( filename, dlURL){
  //console.log("Downloading : ",  filename, dlURL );
  console.log("Downloading : ",  filename );

  var outFile = fs.createWriteStream( filename, { flags: "wx"});
  outFile.on("error", function(err){
    console.error("ERROR: FILE IS EXIST", filename);
    outFile.close();
    ev.emit("done");
  });
  outFile.on("open",function(){
    var httpget = http.get( dlURL , function( jpg ){
      console.log("stream...");
      // ダウンロードした内容をそのまま、ファイル書き出し。
      jpg.pipe(outFile);

      // 終わったらファイルストリームをクローズ。
      jpg.on('end', function () {
        outFile.close();
        console.log("Downloaded : ",  filename );
        //call event "next"
        ev.emit("done");
      }); 
    });
  });
}

function next(){
  index += 1;
  if( index <= maxIndex ){
    var parmaURL;
    if( ops.legacy ){
      parmaURL = createURL( index );
    }else{
      var id = index2thetaId( index );
      parmaURL = createURL( id );
    }
    console.log("============================================");
    console.log(index, " : ", parmaURL);

    pageRequest( index, parmaURL );
  }
}

argv.option([
  {
    name: 'index',
    short: 'i',
    type: 'string',
    description: '通し番号をTHETA URLのIDに変換します。',
    example: "'script --option=value' or 'script -o value'"
  },
  {
    name: 'thetaid',
    short: 't',
    type: 'string',
    description: 'THETA URLのIDを通し番号に変換します',
    example: "'script --option=value' or 'script -o value'"
  },
  {
    name: 'start',
    short: 's',
    type: 'int',
    description: 'ダウンロードを開始する通し番号を指定します。start_idが指定されていたら、start_idが優先されます。'
  },
  {
    name: 'end',
    short: 'e',
    type: 'int',
    description: 'ダウンロードを終了する通し番号を指定します。end_idが指定されていたら、end_idが優先されます。'
  },
  {
    name: 'start_id',
    short: 'S',
    type: 'string',
    description: 'ダウンロードを開始するTHETA IDを指定します。'
  },
  {
    name: 'end_id',
    short: 'E',
    type: 'string',
    description: 'ダウンロードを終了するTHETA IDを指定します。'
  },
  {
    name: 'prefix',
    short: 'p',
    type: 'string',
    description: 'ファイル名のプレフィックス。 / を入れるとディレクトリ指定になる'
  },
  {
    name: 'legacy',
    short: 'l',
    type: 'boolean',
    description: 'URLがspheresの分を走査する'
  }
]);

var args = argv.run();
var ops = args.options;

if( ops.index ){
  var num = index2thetaId( ops.index );
  console.log("index : " + ops.index + ", thetaid : " + num );
}

if( ops.thetaid ){
  var num = thetaId2index( ops.thetaid );
  console.log("thetaid : " + ops.thetaid + ", index : " + num );
}

if( ops.prefix ){
  prefix = ops.prefix;
  console.log( "prefix : ", prefix );
}

if( ops.start_id ){
  var sid = thetaId2index( ops.start_id );
  if( sid != -1 ){
    ops.start = sid;
  }
}

if( ops.end_id ){
  var eid = thetaId2index( ops.end_id );
  if( eid != -1 ){
    ops.end = eid;
  }
}

console.log("args", args);

if( ops.start && ops.end ){
  index = ops.start - 1;
  maxIndex = ops.end;
  console.log("START DOWNLOAD...");
  ev.on("done", next);
  next();
}


