declare module 'react-markdown-renderer' {
  import { FC } from 'react';

  interface MarkdownRendererProps {
    markdown: string;
    className?: string;
  }

  const MarkdownRenderer: FC<MarkdownRendererProps>;
  export default MarkdownRenderer;
} 