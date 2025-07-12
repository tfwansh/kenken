import Head from 'next/head';
import GridInput from '../components/GridInput';

export default function Home() {
  return (
    <>
      <Head>
        <title>KenKen Solver</title>
        <meta
          name='description'
          content='Solve KenKen puzzles instantly'
        />
      </Head>
      <main className='flex flex-col items-center mt-10'>
        <h1 className='text-3xl font-bold mb-6'>KenKen Solver</h1>
        <GridInput />
      </main>
    </>
  );
} 