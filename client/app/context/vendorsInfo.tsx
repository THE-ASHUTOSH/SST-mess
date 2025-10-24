"use client"
import React, { createContext, useContext, useState } from 'react'

interface VendorsInfoContextProps {

}


interface vendorsInterface{
    name : string;
    description? : string;
    price : number;
    image? : string;
    menu : string;
}
const VendorsInfoContext = createContext<VendorsInfoContextProps|undefined>(undefined);
const VendorsInfoProvider = ({children, vendorDetail}:{children:React.ReactNode, vendorDetail:vendorsInterface}) => {
    const [vendors, setvendors] = useState<vendorsInterface|null>(vendorDetail)
  return <VendorsInfoContext.Provider value={{}}>
    {children}
    </VendorsInfoContext.Provider>
}

function useVendorsInfo() {
    const context = useContext(VendorsInfoContext);
    return context;
}

export { VendorsInfoProvider, useVendorsInfo}