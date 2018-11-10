var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var sql = require('mssql');
var env = require('dotenv');
var multer = require('multer');
var path = require('path');

var app = express();
app.use(cors());
app.use(bodyParser());

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now()+'.'+getExtension(file.originalname))
    }
});

function getExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
};

var upload = multer({ storage: storage });
const result = env.config();

const sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),
    debug: true,
    options: {
        encrypt: false
    }
};

app.use(function(err, req, res, next){
    console.error(err);
    res.send({ success: false, message: err })
});

app.listen(Number(process.env.APP_PORT), function(){
    console.log("El servidor esta corriendo");
    console.log(result.parsed);
    console.log(sqlConfig);
});




//ADMINISTRADOR AGREGAR NUEVO ALUMNO
app.post('/v1/students/create', upload.single('file'), (req, res) => {
    let code = req.body.code;
    let name = req.body.name;
    let filename = req.file != null ? req.file.filename : '';

    if(!code && !name && !filename){
        res.send("Ocurrio un error, favor verificar todos los parámetros requeridos.");
    }

    sql.connect(sqlConfig).then(() => {
        var q = `insert into dbo.Students([StudentCode], [StudentName], [StudentPhoto]) values('${code}', '${name}', '${filename}')`;
        console.log(q);
        return sql.query(q)
    }).then(result => {
        var data = {
            success: true,
            message: `Se ha creado ${result.rowsAffected} registro nuevo`
    }

        res.send(data);

        sql.close();
    }).catch(err => {
        return next(err);
    });
});


//MAESTRO VER CLASES ASIGNADAS
app.get('/v1/classes/teacher', function(req, res, next){
    
    var teachercode = req.query.tcode;
    
    if(!teachercode){
        res.send("Ocurrio un error, favor verificar todos los parámetros requeridos.");
    }

    sql.connect(sqlConfig).then(() => {
        return sql.query(`Select [ClassCode], [ClassName] from dbo.Classes where [TeacherCode] = '${teachercode}';`)
    }).then(result => {
        var data= {
            success: true,
            message: '',
            data: result.recordset
        }
        res.send(data);

        sql.close();
    }).catch(err => {
        return next(err);
    });
});



//ALUMNO VER CLASES MATRICULADAS
app.get('/v1/classes/student', function(req, res, next){
    
    var studentcode = req.query.scode;
    
    if(!studentcode){
        res.send("Ocurrio un error, favor verificar todos los parámetros requeridos.");
    }

    sql.connect(sqlConfig).then(() => {
        return sql.query(`SELECT Enrollment.ClassCode, Classes.ClassName FROM Enrollment RIGHT JOIN Classes ON Enrollment.ClassCode = Classes.ClassCode WHERE Enrollment.StudentCode = '${studentcode}';`)
    }).then(result => {
        var data= {
            success: true,
            message: '',
            data: result.recordset
        }
        res.send(data);

        sql.close();
    }).catch(err => {
        return next(err);
    });
});


//MAESTROS VER ALUMNOS MATRICULADOS EN UNA CLASE
app.get('/v1/class/students', function(req, res, next){
    
    var classcode = req.query.ccode;
    
    if(!classcode){
        res.send("Ocurrio un error, favor verificar todos los parámetros requeridos.");
    }

    sql.connect(sqlConfig).then(() => {
        return sql.query(`SELECT Enrollment.StudentCode, Students.StudentName FROM Enrollment RIGHT JOIN Students ON Enrollment.StudentCode = Students.StudentCode WHERE Enrollment.ClassCode = '${classcode}';`)
    }).then(result => {
        var data= {
            success: true,
            message: '',
            data: result.recordset
        }
        res.send(data);

        sql.close();
    }).catch(err => {
        return next(err);
    });
});



//MAESTRO PUEDE TOMAR ASISTENCIA
app.post('/v1/teachers/attendance', (req, res) => {
    let studentcode = req.body.scode;
    let classcode = req.body.ccode;
    let date = new Date();

    sql.connect(sqlConfig).then(() => {
        var q = sql.query(`Select [EnrollID] from dbo.Enrollment where ([StudentCode] = '${studentcode}') and ([ClassCode] = '${classcode}');`)
    });
    
    if(q === ''){
        res.send("Ocurrio un error, verifique que el alumno este matriculado en esta clase");
    }

    else{

        sql.connect(sqlConfig).then(() => {
            var q = `insert into dbo.Attendance([StudentCode], [ClassCode], [AttendanceDate]) values('${studentcode}', '${classcode}', '${date}')`;
            console.log(q);
            return sql.query(q)
        }).then(result => {
            var data = {
                success: true,
                message: `Se ha creado ${result.rowsAffected} registro nuevo`
        }
    
            res.send(data);
    
            sql.close();
        }).catch(err => {
            return next(err);
        });
    }
});


