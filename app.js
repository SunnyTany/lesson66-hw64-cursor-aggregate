var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')

var app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)

app.use(function(req, res, next) {
  next(createError(404))
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  res.status(err.status || 500)
  res.render('error')
})

async function iterateDocumentsWithCursor() {
  try {
    await client.connect()
    const database = client.db(process.env.DB_NAME)
    const collection = database.collection('users')

    const cursor = collection.find({})
    while (await cursor.hasNext()) {
      const document = await cursor.next()
      console.log('Документ', document)
    }
  } catch(error) {
    console.error('Помилка при ітерації документів через курсор:', error)
  } finally {
    await client.close()
  }
}

async function aggregateQuery() {
  try {
    await client.connect()
    console.log('Connected to Database')

    const db = client.db(dbName)

    const collections = await db.listCollections({}, { nameOnly: true }).toArray()
    const usersCollectionExists = collections.some((col) => col.name === 'users')

    if (usersCollectionExists) {
      await db.collection('users').drop()
      console.log(chalk.redBright('Collection "users" has been dropped.'))
    }

    const users = [
      { name: 'Bob Doe', age: 30, skills: ['HTML', 'CSS', 'JavaScript', 'Node.js'] },
      { name: 'Jane Doe', age: 25, skills: ['Python', 'Node.js', 'Django'] },
      { name: 'John Doe', age: 35, skills: ['Java', 'Spring'] },
      { name: 'Jack Daniels', age: 40, skills: ['JavaScript', 'HTML'] },
      { name: 'Jonny Walker', age: 21, skills: ['JavaScript', 'React', 'Node.js'] },
      { name: 'Jim Walker', age: 23, skills: ['JavaScript', 'React', 'Node.js'] },
      { name: 'Bob Walker', age: 25, skills: ['JavaScript', 'React', 'Node.js'] }
    ]

    await db.collection('users').insertMany(users)
    console.log(chalk.greenBright('Документи вставлено у колекцію "users".'))

    const skillFilteredUserAggregation = await db
      .collection('users')
      .aggregate([
        {
          $match: {
            skills: { $in: ['Node.js', 'React'] }
          }
        },
        {
          $unwind: {
            path: '$skills'
          }
        },
        {
          $match: {
            skills: { $in: ['Node.js', 'React'] }
          }
        },
        {
          $group: {
            _id: '$skills',
            total_users: { $sum: 1 }
          }
        }
      ])
      .toArray()

    console.log(chalk.cyanBright('User count by skills:'), skillFilteredUserAggregation)

    await client.close()
  } catch (error) {
    console.error('Error connecting to MongoDB:', error)
    await client.close()
  }
}

app.use(iterateDocumentsWithCursor)

app.use(aggregateQuery)

app.listen(3000)

module.exports = app