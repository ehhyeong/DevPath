import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import InterviewEvidenceEditor from './InterviewEvidenceEditor'

it('선택한 실제 근거를 저장하고 실패 시 선택을 유지하여 다시 저장한다', async () => {
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const close = vi.fn()
  render(<InterviewEvidenceEditor question={{ id: 'Q1', category: '보안', question: '인가 검증은?', answer: '소유권 확인', keywords: [], level: 2 }} evidence={{ tasks: [{ id: 'DP-101', title: '인가 구현', status: 'todo' }], apis: [{ id: 'A-current', method: 'POST', path: '/reports' }], tables: ['REPORTS'] }} onSave={save} onClose={close} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'DP-101 인가 구현' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'POST /reports' }))
  fireEvent.change(screen.getByLabelText('근거 테이블'), { target: { value: 'REPORTS' } })
  fireEvent.click(screen.getByRole('button', { name: '연결 저장' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('연결을 저장하지 못했습니다.')
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('checkbox', { name: 'DP-101 인가 구현' })).toBeChecked()
  expect(screen.getByLabelText('근거 테이블')).toHaveValue('REPORTS')
  fireEvent.click(screen.getByRole('button', { name: '연결 저장' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(save).toHaveBeenLastCalledWith({ tasks: ['DP-101'], apis: ['POST /reports'], erd: 'REPORTS' })
})
