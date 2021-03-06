import express from 'express'
import { auth, getHash } from './library/auth'
import { hash } from './library/secrets/secrets'

import * as lib from './library/library'
import * as libToken from './library/token'

import type { Session } from './types/auth'
import type { TopicsKeys } from './types/token'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORSを許可する
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// ルートアクセス
app.get('/', (req, res) => {
  console.log('[' + lib.showTime() + '] root access')
  res.redirect(301, 'https://winds-n.com')
})

app.post('/get_status', async (req, res) => {
  const { session, token }: { session: Session; token: string } = req.body
  console.log('[' + lib.showTime() + '] /get_status: ' + session.userid)
  const authResult = await auth(session)
  if (!authResult) return res.json({ status: false })
  const tokenResult = await libToken.getStatus(token)
  return res.json({ status: true, updated: tokenResult })
})

app.post('/add_notification', async (req, res) => {
  const { session, token }: { session: Session; token: string } = req.body
  console.log('[' + lib.showTime() + '] /add_notification: ' + session.userid)
  const authResult = await auth(session)
  if (!authResult) return res.json({ status: false })
  const tokenResult = await libToken.updateToken(session.userid, session.useragent, token, true)
  if (tokenResult.error) return res.json({ status: false })
  return res.json({ status: true, updated: tokenResult.result })
})

app.post('/remove_notification', async (req, res) => {
  const { session, token }: { session: Session; token: string } = req.body
  console.log('[' + lib.showTime() + '] /remove_notification: ' + session.userid)
  const authResult = await auth(session)
  if (!authResult) return res.json({ status: false })
  const tokenResult = await libToken.updateToken(session.userid, session.useragent, token, false)
  if (tokenResult.error) return res.json({ status: false })
  return res.json({ status: true, updated: tokenResult.result })
})

type UpdateTopicReq = { session: Session; token: string; topicName: TopicsKeys }
app.post('/update_topic', async (req, res) => {
  const { session, token, topicName }: UpdateTopicReq = req.body
  console.log('[' + lib.showTime() + '] /update_topic: ' + session.userid, topicName)
  const authResult = await auth(session)
  if (!authResult) return res.json({ status: false })
  const topicResult = await libToken.updateTopic(token, topicName)
  if (topicResult.error) return res.json({ status: false })
  return res.json({ status: true, updated: topicResult.result })
})

const client = './client/build'
app.use('/manager', express.static(client))
app.use('/manager/static', express.static(client))

const clientPrefix = '/manager'

app.post(clientPrefix + '/login', (req, res) => {
  console.log('[' + lib.showTime() + '] /manager/login')
  const { pass } = req.body
  if (hash === getHash(pass)) {
    return res.json({ status: true })
  } else {
    return res.json({ status: false })
  }
})

import { getAll as getAllSent } from './library/sent'
import { getAll as getAllReservation } from './library/send'

app.post(clientPrefix + '/status', async (req, res) => {
  console.log('[' + lib.showTime() + '] /manager/status')
  const { pass } = req.body
  if (hash === getHash(pass)) {
    const sent = await getAllSent()
    const reserved = await getAllReservation()
    if (!sent || !reserved) return res.json({ status: true, data: [] })
    return res.json({ status: true, data: { sent, reserved } })
  } else {
    return res.json({ status: false })
  }
})

import { sendNotification, insert, requestRemove } from './library/send'
import type { NotificationRequest } from './library/send'

app.post(clientPrefix + '/request', async (req, res) => {
  console.log('[' + lib.showTime() + '] /manager/request')
  const { pass, notification }: { pass: string; notification: NotificationRequest } = req.body
  if (hash === getHash(pass)) {
    if (notification.immediately) {
      console.log('[' + lib.showTime() + '] /manager/request: immediately')
      await sendNotification(notification)
      return res.json({ status: true, result: 'sent' })
    } else {
      console.log('[' + lib.showTime() + '] /manager/request: reservation')
      await insert(notification)
      return res.json({ status: true, result: 'reservated' })
    }
  } else {
    return res.json({ status: false })
  }
})

app.post(clientPrefix + '/remove', async (req, res) => {
  console.log('[' + lib.showTime() + '] /manager/remove')
  const { pass, id }: { pass: string; id: string } = req.body
  if (hash === getHash(pass)) {
    await requestRemove(id)
    const reserved = await getAllReservation()
    return res.json({ status: true, data: { reserved } })
  } else {
    return res.json({ status: false })
  }
})

app.listen(3011)
