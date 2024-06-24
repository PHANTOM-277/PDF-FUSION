import { useState } from 'react'
import './App.css'
import {Route, Routes} from 'react-router-dom'
import Home from './pages/Home'
import MergePage from './pages/MergePage'
import SplitPage from './pages/SplitPage'

function App() {

  return (
    <Routes>
      <Route path='/' element={<Home/>}/> {/*route for home page*/}
      <Route path='/merge' element={<MergePage/>}/> {/*route for merge page*/}
      <Route path='/split' element={<SplitPage/>}/> {/*route for split page*/}
    </Routes>
  )
}

export default App
