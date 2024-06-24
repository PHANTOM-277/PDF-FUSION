import React from 'react' 
import styles from './Home.module.css'
import {Link} from 'react-router-dom'

const Home = ()=>{
    return(
        <div className={styles.main}> {/*React fragment */}
            <h1 className={styles.Heading}>PDF-FUSION</h1>
            <p className={styles.about}>A PDF project for merging and splitting pdfs</p>
            <div className={styles.container}>
                <Box  link={'/merge'} header={'PDF-Merge'} para={"Upload multiple pdf files to be merged into a single pdf"}/>
                <Box  link={'/split'} header={'PDF-Split'} para={"Split a single pdf into multiple pdf files "}/>
            </div>
            <p className={styles.project_data}>This project was made by @PHANTOM277
            , Github link: <a href='https://github.com/PHANTOM-277'>https://github.com/PHANTOM-277</a></p>
        </div>
    );
}

const Box = ({link,header,para})=>{
    return(
        <Link to={link} className={styles.link}>
            <p className={styles.box_heading}>{header}</p>
            <p className={styles.box_para}>{para}</p>
        </Link>
    )
}

export default Home