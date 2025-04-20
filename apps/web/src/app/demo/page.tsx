'use client';

// import Image from 'next/image'
// import tenantLogo from './img/microsoft_logo.png';
// import d from "../../../public/img/microsoft_logo.png"

const DemoPage = () => {
    return <>
        <h1 className="text-2xl">Demo Page</h1>
        <img
            src={"/img/microsoft_logos.png"}
            className="mr-3 h-8"
            alt="Microsoft Logo"
            width={30}
            height={30} />
    </>
}

export default DemoPage;