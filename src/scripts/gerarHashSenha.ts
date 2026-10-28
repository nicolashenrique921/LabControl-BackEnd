import bcrypt from 'bcrypt';

async function gerarHash() {
  const senha = process.argv[2];
  if (!senha) {
    console.log('Uso: npx ts-node src/scripts/gerarHashSenha.ts SUA_SENHA');
    return;
  }
  const hash = await bcrypt.hash(senha, 10);
  console.log('Hash gerado:');
  console.log(hash);
}

gerarHash();