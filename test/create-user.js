const { api: h, apiPromise: hp } = require('./initialized-pg-helper');

const User = 'User';
const Matrix = 'matrix';

const toInserts = [
  {
    username: '', password: 'xyzgogogo', level: 5,
    extra: { "qq": "332211", "wechat": "112233" },
    cards: [{ name: 'A', dmg: 30 }, { name: 'B', dmg: 300 }],
    balance: 88.88,
    createTime: Date.now(),
    lastUpdateTime: Date.now() + 30000,
    isLocked: true,
  },
];
// h.insert('User', toInserts[0], null, (err, result) => {
//   console.log(err, result);
// });

async function main() {
  const user1 = await hp.select(User, { filter: { id: 1 }, fields: ['id', 'balance'] });
  const user2 = await hp.select(User, { filter: { id: 1 } });
  console.log(user1);
  console.log(user2);
  const matrix = await hp.select(Matrix, { filter: { id: 1 }, db: 'game' });
  console.log(matrix);

  await hp.startMultiDbTransaction(async function(clientMap){
    console.log('startMultiDbTransaction');
    const user = await hp.select(User, { client:clientMap.zzk, filter: { id: 1 }, fields: ['id', 'balance'] });
    const matrix = await hp.select(Matrix, { client:clientMap.game, filter: { id: 1 } });
    console.log(user, matrix);
  });
  console.log('end startMultiDbTransaction');
}

main().catch(err=>console.log(err));
