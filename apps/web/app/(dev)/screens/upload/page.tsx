import { ProfileUploadScreen } from '@/features/profile-upload/profile-upload-screen';

interface PageProps {
  searchParams: Promise<{ phase?: string }>;
}

const isPhase = (v: string | undefined): v is 'idle' | 'uploading' | 'parsing' | 'done' | 'error' =>
  v === 'idle' || v === 'uploading' || v === 'parsing' || v === 'done' || v === 'error';

export default async function DevUploadPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  if (isPhase(sp.phase)) {
    return <ProfileUploadScreen initialPhase={sp.phase} simulate={true} />;
  }
  return <ProfileUploadScreen simulate={true} />;
}
