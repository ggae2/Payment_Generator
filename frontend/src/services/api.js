import axios from 'axios'

const API = axios.create({ baseURL: '/api' })

export const agentChat = (message, clientContext = {}, history = []) =>
  API.post('/agent/chat', { message, client_context: clientContext, history })

export const generateMessage = (scheme, msgType, params) =>
  API.post('/generate', { scheme, msg_type: msgType, params }, { responseType: 'blob' })

export const validateXml = (messageType, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return API.post(`/validate/${messageType}`, fd)
}
