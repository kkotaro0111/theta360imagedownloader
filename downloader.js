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
function createURLByNum(num){
  var id = index2thetaId( num );
  return createURL( id );
}
function createURL(thetaId){
  return thetaURL + "/s/" + thetaId;
}

function checkExistFile( jpg, mp4 ){
  var existJpg = fs.existsSync( jpg );
  var existMp4 = fs.existsSync( mp4 );
  //console.log("exist", existJpg, existMp4);
  return !(existJpg || existMp4);
}

function pageRequest( idNum, thetaId, url ){
  var jpg = idNum + "_" + thetaId + ".jpg";
  var mp4 = idNum + "_" + thetaId + ".mp4";
  if( checkExistFile( jpg, mp4 ) ){
    request( url, function(error, response, body){
      if(!error && response.statusCode == 200){
        var $ = cheerio.load(body);
        var $urlText = $("#urlText");
        var imageURL = $urlText.val().replace(/https/, "http");
        var type = $urlText.attr("name");
        var filename = prefix + idNum + "_" + thetaId + ext[type];

        console.log("image url = ", imageURL);

        download( filename , imageURL);
      }else if(!error && response.statusCode == 302){
        var redirectURL = response.Location;
        pageRequest( redirectURL );
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
  console.log("Donwloading : ",  filename, dlURL );

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
    var id = index2thetaId( index );
    var thetaURL = createURL( id );
    console.log(index, " : ", thetaURL);

    pageRequest( index, id, thetaURL );
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
    description: 'ダウンロードを開始する通し番号を指定します'
  },
  {
    name: 'end',
    short: 'e',
    type: 'int',
    description: 'ダウンロードを終了する通し番号を指定します'
  },
  {
    name: 'prefix',
    short: 'p',
    type: 'string',
    description: 'ファイル名のプレフィックス。 / を入れるとディレクトリ指定になる'
  }
]);

var args = argv.run();
var ops = args.options;
console.log("args", args);

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

if( ops

if( ops.start && ops.end ){
  index = ops.start - 1;
  maxIndex = ops.end;

  console.log("START DOWNLOAD...");
  ev.on("done", next);
  next();
}


