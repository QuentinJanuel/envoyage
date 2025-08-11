import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function ApiPage() {
  const typedocUrl = useBaseUrl('/typedoc/');
  return (
    <Layout title="API Reference">
      <iframe
        src={typedocUrl}
        style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none' }}
        title="API Reference"
      />
    </Layout>
  );
}

