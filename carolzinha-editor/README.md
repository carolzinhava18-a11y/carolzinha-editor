# Carolzinha Editor 🎬

App de edição automática de vídeos com integração Google Drive.

---

## Como subir no Vercel (passo a passo)

### 1. Criar conta no GitHub
- Acesse github.com e crie uma conta gratuita

### 2. Criar repositório
- Clique em "New repository"
- Nome: `carolzinha-editor`
- Marque "Public"
- Clique em "Create repository"

### 3. Subir os arquivos
- Na página do repositório, clique em "uploading an existing file"
- Arraste TODOS os arquivos desta pasta (incluindo a pasta `src`)
- Clique em "Commit changes"

### 4. Criar conta no Vercel
- Acesse vercel.com
- Clique em "Sign up" → "Continue with GitHub"

### 5. Deploy
- No Vercel, clique em "Add New Project"
- Selecione o repositório `carolzinha-editor`
- Clique em "Deploy"
- Aguarde ~1 minuto
- Pronto! Você terá uma URL tipo: `carolzinha-editor.vercel.app`

---

### 6. Atualizar o Google Cloud
Após ter a URL do Vercel, volte no Google Cloud Console:
- APIs e serviços → Credenciais → Carolzinha Editor (lápis ✏️)
- Em "Origens JavaScript autorizadas" adicione sua URL do Vercel
- Em "URIs de redirecionamento autorizados" adicione também
- Salvar

---

Pronto! O app estará funcionando com login do Google Drive. 🚀
