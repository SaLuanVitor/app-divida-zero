## [FASE-3b.5] Mobile UI — Phone Input + WA Toggles

**Description:** Adicionar tela de configuração de WhatsApp no mobile: input de telefone com máscara, fluxo de verificação, toggles de preferências WA.

**Acceptance Criteria:**
- [x] Input de telefone com máscara (+55 XX XXXXX-XXXX)
- [x] Botão "Verificar Telefone" → envia código via API
- [x] Tela de input de código (6 dígitos) com validação
- [x] Feedback visual: código enviado, código inválido, limite excedido
- [x] Toggles WA: "Receber notificações WhatsApp", "Lembretes de vencimento", "Resumo semanal"
- [x] Opt-in default OFF (precisa ativar explicitamente)
- [x] Indicador visual de telefone verificado/não verificado
- [ ] Testes unitários dos componentes

**Technical Notes:**
- Seguir padrão de componentes existentes (NativeWind + TypeScript)
- Estado de verificação salvo via AsyncStorage + sincronizado via API
- Tela integrada na seção de notificações existente do app

**Dependencies:** FASE-3b.1 + FASE-3b.2 (API pronta)
**Complexity:** M (3 componentes + fluxo de verificação)
**Risks:** UX de verificação pode ser confusa se não tiver feedback claro

**Files:**
- `mobile/src/screens/WhatsAppSettings.tsx`
- `mobile/src/components/PhoneInput.tsx`
- `mobile/src/components/VerificationCodeInput.tsx`
- `mobile/src/services/api/whatsapp.ts`
- `mobile/src/types/settings.ts`
- `mobile/src/context/theme.ts` (se necessário)
