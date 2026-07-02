import { UserRegistrationHandler } from '../../app/src/Features/User/UserRegistrationHandler.mjs'
import { User } from '../../app/src/models/User.mjs'

const email = 'user@local'
const password = 'overleaf123'

try {
  const existing = await User.findOne({ email }).exec()
  if (existing) {
    console.log('USER_EXISTS id=' + existing._id + ' isAdmin=' + existing.isAdmin)
    process.exit(0)
  }
  const { user, setNewPasswordUrl } = await UserRegistrationHandler.registerNewUser({
    email,
    password,
    first_name: 'User',
    last_name: '',
  })
  console.log('CREATED id=' + user._id + ' email=' + user.email + ' isAdmin=' + user.isAdmin)
  if (setNewPasswordUrl) console.log('setNewPasswordUrl=' + setNewPasswordUrl)
  process.exit(0)
} catch (e) {
  console.error('ERROR ' + e.message)
  console.error(e.stack)
  process.exit(1)
}
