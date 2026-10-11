# Como implantar o DersGym no Coolify (VPS)

Este guia rápido explica como implantar seu fork **DersGym** em um servidor VPS usando o **Coolify**.

---

## 1. Pré-requisitos no Coolify
1. Instância do Coolify em execução no seu VPS.
2. Seu repositório GitHub (`anderson-derscorp/DersGym`) conectado ao Coolify.
3. Um subdomínio ou domínio apontando para o IP do seu VPS (ex: `gym.derscorp.com`).

---

## 2. Criar Aplicação no Coolify
1. No painel do Coolify, acesse seu Projeto/Ambiente e clique em **+ New Resource**.
2. Escolha **Git Repository (Private or Public)** e selecione o repositório `anderson-derscorp/DersGym`.
3. Em **Branch**, selecione `main`.
4. Em **Build Pack**, escolha **Docker Compose**.
5. Em **Custom Docker Compose Path**, defina:
   ```text
   docker-compose.coolify.yml
   ```
   *(Isto garante que o Coolify compile o código diretamente do seu repositório Git, sem tentar puxar imagens antigas).*

---

## 3. Variáveis de Ambiente no Coolify
No menu **Environment Variables** da aplicação no Coolify, configure:

```env
# Seu domínio HTTPS real (sem https://)
RP_ID=gym.seudominio.com

# Nome da sua instância para os passkeys
RP_NAME="DersGym"

# Porta interna do Nginx
PORT=3000
NGINX_PORT=80
```

> **Importante para Passkeys (WebAuthn):**
> O `RP_ID` deve ser exatamente o hostname configurado em **Domains** no Coolify (ex: se o domínio for `https://gym.seudominio.com`, o `RP_ID` deve ser `gym.seudominio.com`). O Coolify cuidará automaticamente do certificado SSL (Let's Encrypt).

---

## 4. Persistência de Dados (Volumes)
O `docker-compose.coolify.yml` já utiliza o volume nomeado `dersgym_data` apontando para `/data`:
- Todos os perfis, passkeys, treinos, dieta, diário, suplementos e medidas ficam salvos permanentemente em `/data`.
- Mesmo após recriação ou atualização de containers, seus dados continuam preservados.

---

## 5. Deploy
1. Clique no botão **Deploy**.
2. O Coolify compilará a API Node e o Frontend React e iniciará ambos os containers.
3. Acesse `https://gym.seudominio.com` e crie sua conta com Passkey!
