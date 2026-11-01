import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EventManagerOnboarding from './EventManagerOnboarding';

const renderGuide = (options: { open?: boolean; isDesktop?: boolean; canCreateEvents?: boolean; initialStep?: number } = {}) => renderToStaticMarkup(
  <EventManagerOnboarding open isDesktop canCreateEvents onClose={vi.fn()} onComplete={vi.fn()} onNavigate={vi.fn()} {...options} />,
);

describe('event manager guide access and viewport presentation', () => {
  it('renders no modal or focusable actions while closed', () => {
    expect(renderGuide({ open: false })).toBe('');
  });

  it('offers event creation only when creation permission is available', () => {
    expect(renderGuide({ initialStep: 1 })).toContain('새 이벤트 만들기');
    const managementOnly = renderGuide({ initialStep: 1, canCreateEvents: false });
    expect(managementOnly).not.toContain('새 이벤트 만들기');
    expect(managementOnly).toContain('이벤트 목록 열기');
  });

  it('keeps the mobile guide readable without sending users into a desktop-only screen', () => {
    const mobile = renderGuide({ isDesktop: false });
    expect(mobile).toContain('PC에서 진행해 주세요.');
    expect(mobile).not.toContain('호스트 그룹 확인하기');
    expect(mobile).toContain('aria-modal="true"');
  });

  it.each([-10, Number.NaN, Number.POSITIVE_INFINITY])('opens safely when given an invalid resume step: %s', initialStep => {
    expect(renderGuide({ initialStep })).toContain('호스트 그룹에서 운영을 시작해요');
  });

  it('resumes the final step rather than going past the end of the guide', () => {
    expect(renderGuide({ initialStep: 99 })).toContain('가이드 완료');
  });
});
