const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const mysql = require('mysql');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const dotenv = require('dotenv');

//설정 파일의 내용 가져오기
dotenv.config();

//서버 설정
const app = express();
app.set('port', process.env.PORT || 9000);

//로그를 매일 기록하기 위한 설정
let FileStreamRotator = require('file-stream-rotator');
let fs = require('fs');

//로그를 기록할 디렉토리 경로 생성
let logDirectory = path.join(__dirname, 'log');

//디렉토리가 없으면 생성
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

//로그 파일 옵션을 설정
let accessLogStream = FileStreamRotator.getStream({
    date_format:'YYYYMMDD',
    filename:path.join(logDirectory, 'access-%DATE%.log'),
    frequency:'daliy',
    verbose:false
});
//로그 기록 설정
app.use(morgan('combined', {stream:accessLogStream}));

//압축해서 전송하는 옵션 설정
app.use(compression());

//POST 방식의 파라미터 읽을 수 있도록 설정
let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}));

//세션을 데이터베이스에 저장하는 작업

//데이터베이스 접속 정보
let options = {
    host:'127.0.0.1',
    port:3306,
    user:'root',
    password:'wnddkd',
    database:'adam'
};
//세션을 저장하기 위한 MySQL 데이터베이스 저장소 생성
const MariaDBStore = require('express-mysql-session')(session);
//세션 설정
app.use(session({
    secret:process.env.COOKIE_SECRET,
    resave:false,
    saveUninitialized:true,
    store:new MariaDBStore(options)
}));

//파일 업로드 설정
const upload = multer({
    storage:multer.diskStorage({
        destination(req, file, done){
            done(null, 'public/img');
        },
        filename(req, file, done){
            const ext = path.extname(file.originalname);
            done(null, path.basename(file.originalname, ext) +
                Date.now() + ext);
        }
    }),
    limits:{fileSize: 10*1024*1024}
});

//정적 파일의 경로를 설정
app.use('/', express.static('public'));

//파일 다운로드를 위한 모듈
let util = require('util');
let mime = require('mime');

//데이터베이스 연결
let connection = mysql.createConnection(options);
connection.connect((error) => {
    if(error){
        console.log(error);
        throw error;
    }
})

//기본 요청을 처리
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


//에러 발생시 처리
app.use((err, req, res, next)=>{
    console.log(err);
    res.status(500).send(err.message);
});

//서버 구동
app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});