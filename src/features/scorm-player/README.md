# Módulo SCORM Player

Este diretório contém os componentes, lógica de comunicação e hooks específicos para o reprodutor SCORM 1.2.

## Componentes a serem criados aqui:
- `ScormPlayer.tsx`: Componente que encapsula o `<iframe>` e gerencia a injeção do objeto global `window.API`.
- `useScormAPI.ts`: Custom hook que intercepta os comandos do SCORM (Initialize, GetValue, SetValue, Commit, Finish) e faz a ponte com o estado do React.
- `trackingService.ts`: Funções para fazer chamadas HTTP para o backend (/api/scorm/track) registrando as atualizações.
