# Módulo do Superadmin (Você)

Este diretório contém os componentes, lógica e formulários reservados para o seu controle administrativo global da plataforma.

## Componentes a serem criados aqui:
- `SuperadminDashboard.tsx`: Visão agregada de faturamento, novos tenants ativos e status do servidor/APIs.
- `TenantManagementTable.tsx`: Listagem das empresas clientes cadastradas na plataforma.
- `NewTenantForm.tsx`: Formulário para cadastrar novos inquilinos (Empresa + e-mail do RH + subdomínio slug) que dispara o gatilho de criação de credenciais e e-mail automático via Resend.
