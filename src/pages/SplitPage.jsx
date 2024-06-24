import React, { useReducer } from 'react'
import styles from './SplitPage.module.css'
import {Link} from 'react-router-dom' //we're gonna give a link back to home page
import {PDFDocument} from 'pdf-lib'

//creates the blobdata , used in splitpdf function
const createBlob = async (pdfData) => {
    const blobdata = new Blob([pdfData], { type: 'application/pdf' });
    return blobdata;
};

//loads the file and makes a url so that the ifram can display it
async function loadfile(file, frame_ref){
    var arraybufferfile = await file.arrayBuffer();
    var loadedfile = await PDFDocument.load(arraybufferfile);
    var pagecount = loadedfile.getPageCount();
    var url= URL.createObjectURL(file);

    frame_ref.current.onload = ()=>{
        URL.revokeObjectURL(url);
    }

    frame_ref.current.src = url;
    return [loadedfile,pagecount];
}



//code logic : check_before_search -> then load each file and do all that , infact save the urls in a list 
//once all pdfs are there then call reducer and add the stuff then column3 will render them all
const check_before_search=(myFiles, setMyFiles)=>{
    //this function works when the user clicks the split button ,
    //its work is to determine whether we are ready to split the files or not
    //it checks whether we have loaded a document , made a split section or not ,
    //if we have left any input blank or if the starting page>ending page (not allowed)
    // if beginning page is equal to ending page , then just that page will be rendered ( allowed case )
    var isReadyForSplit = true;
    var reason = '';
    if(myFiles.data){//i.e a file is loaded
        if(myFiles.pdf_count.length){//i.e if the user has created any split sections
            //now check if beginning >= ending for pdfs from 0 to length -1
            var i;
            for(i=0;i<myFiles.pdf_count.length;i++){
                if( //these are the cases that are not allowed
                    myFiles.beginning_page[i]===undefined ||
                    myFiles.ending_page[i] === undefined ||
                    myFiles.beginning_page[i] === 0 ||
                    myFiles.ending_page[i] === 0
                ){
                    reason = `pdf number: ${i+1} has not been assigned pages.`;
                    isReadyForSplit = false;
                }
                if(myFiles.ending_page[i]<myFiles.beginning_page[i]){//this case is also not allowed
                    reason = `pdf number: ${i+1} starting page cannot be more than ending page`;
                    isReadyForSplit = false;
                }
                if(myFiles.ending_page[i]>myFiles.pages){
                    reason = `pdf number : ${i+1} last page cannot exceed total pages count`;
                    isReadyForSplit = false;
                }
                if(myFiles.beginning_page[i]<1){
                    reason = `pdf number : ${i+1} beginning page cannot be less than 1`;
                    isReadyForSplit = false;
                }
            }
        }
        else{
            reason = 'No split section created';
            isReadyForSplit = false;
        }
    }
    else{
        reason = 'No File Loaded';
        isReadyForSplit = false;
    }
    if(isReadyForSplit){//i.e we can proceed to split
        splitpdfs(myFiles,setMyFiles); // go to the async function which splits the pdfs 
    }
    else{
        alert(`not ready to split , reason : ${reason}`);
    }
}


//called if user clicks on split button and all input is valid
const splitpdfs = async (myFiles, setMyFiles)=>{
    var splitted_pdfs = []; //this list will store all the pdfs
    var saved_pdfs = []; //this list will have all saved pdfs
    var blobdatas = [];//this list will store the blobdatas
    var urls = []; // this will store the urls of all pdfs
    console.log(`inside splitpdfs function , no. of pdfs to create : ${myFiles.pdf_count.length}`);
    var i , j;
    for(i=0; i<myFiles.pdf_count.length;i++){ 
        // this 'i' can be used to acces beginning_page and ending_page of that particular pdf
        splitted_pdfs[i] = await PDFDocument.create();
        for(j = myFiles.beginning_page[i]-1 ; j<myFiles.ending_page[i]; j++){
            var [copied_page] = await splitted_pdfs[i].copyPages(myFiles.data, [j]);
            //we do [copied_page] because copyPages returns an array
            splitted_pdfs[i].addPage(copied_page);
        }
        saved_pdfs[i] = await splitted_pdfs[i].save();//save the pdf in bufferarray 
        blobdatas[i] = await createBlob(saved_pdfs[i]);//convert it to blob data
        urls[i] = URL.createObjectURL(blobdatas[i]);
    }
    setMyFiles({type:'set_url', payload:urls});
}



const myreducer = (state, action)=>{
    switch(action.type){
        case 'changeFile':
            return{
                ...state,
                data: action.payload, // has the pdf-lib loaded pdf
                pages : action.pages,//stores the no. of pages in the pdf
                isLoading:false
            }
        
        case 'loading_file':
            return{
                ...state,
                isLoading:true
            }

        case 'add_pdf':
            if(state.data){//only increment pdf_count list if the file is loaded
                var newlist = [...state.pdf_count, state.pdf_count.length]
                return{
                    ...state,
                    pdf_count: newlist
                }
            }
            else{//else just return state , eat five star do nothing
                return state;
            }

        case 'set_beg'://short for set_beginning
            var new_beg = [...state.beginning_page];
            new_beg[action.filenumber] = action.payload;
            return{
                ...state,
                beginning_page: new_beg
            }

        case 'set_end'://set the end page for a particular pdf
            var new_end = [...state.ending_page];
            new_end[action.filenumber] = action.payload;
            return{
                ...state,
                ending_page: new_end
            }
        
        case 'set_url':
            return{
                ...state,
                urls : action.payload,
                isSplitted: true
            }
        
        default:
            return state;
    }
}

const SplitPage = ()=>{

    var [myFiles, setMyFiles] = useReducer(myreducer,{
        data:null,
        pages:null,//number of pages in original pdf
        isLoading:false,
        pdf_count:[],//.length can tell you number of pdfs
        beginning_page:[], //the index determines which pdf no. , and this tells the starting page(inclusive)
        ending_page:[], //the index determines which pdf no. , and this tells the ending page (inclusive)
        isSplitted:false,//tells whether splitting process is over or not (meant for column3)
        urls:[],
    });
    var inputRef = React.useRef();//ref for the file input for when user loads a file
    var iframeRef = React.useRef();//to change the src of iframe

    const handleinput = async ()=>{//first load the file , then call the reducer function
        setMyFiles({type:'loading_file'})
        var pagecount , loadedfile;
        [loadedfile,pagecount] = await loadfile(inputRef.current.files[0], iframeRef);
        console.log(pagecount);
        setMyFiles({type:'changeFile', payload:loadedfile, pages: pagecount});
    }

    return(
        <div className={styles.main}>{/*main component */}
            {/*use link tag for home btn */}   
            <Link to='/' title='home-page' className={styles.home}>
                <img src='/assets/home3.png' alt='homebtn' className={styles.home_img}></img>{/*classname : home_img */}
            </Link>
            <p className={styles.title}>PDF-SPLIT</p>{/*classname: title */}

            <div className={styles.column1}>
                <input 
                    className={styles.my_file_input} 
                    ref={inputRef} 
                    type='file' 
                    accept='.pdf'
                    onChange={handleinput}>
                </input>
                
                <iframe className={styles.my_iframe} ref={iframeRef} ></iframe>
            </div>

            <div className={styles.column2}>
                <Column2 myFiles={myFiles} setMyFiles={setMyFiles}/>
            </div>

            <div className={styles.column3}>
                {myFiles.isSplitted && <Column3 myFiles={myFiles}/>}
            </div>
        </div>
    )
}

const Column2= ({myFiles,setMyFiles})=>{//another component
    return(
        <>
        <p className={styles.page_count}>Total Pages: {myFiles.pages}</p>
        <button 
            className={styles.add_btn}
            title='Add Split Section'
            onClick={()=>setMyFiles({type:'add_pdf'})}> {/*go to the reducer function */}
            <img className={styles.add_btn_img} src='/assets/add.png'></img>
        </button>
        <div className={styles.file_container}>{/*the container with individual file boxes */}
            {myFiles.pdf_count.map((item)=><IndividualFile_Column2 key={item} file_no={item} setMyFiles={setMyFiles}/>)}
        </div>
        <button 
            className={styles.split_btn} 
            onClick={()=>check_before_search(myFiles, setMyFiles)}>
                Split
            </button>
        </>
    )
}

const IndividualFile_Column2 = ({file_no, setMyFiles})=>{

    var beg_input_ref = React.useRef();
    //a reference for the first page input , its current value will be sent to setMyFiles
    var end_input_ref = React.useRef();
    //a reference for the last page input , its current value will be sent to setMyFiles
    
    return(
        <div className={styles.split_input_box}>
            <p className={styles.split_input_box_text}>pdf {file_no+1}:</p>
            <input 
                className={styles.split_input_box_input} 
                title='set first page'
                ref = {beg_input_ref}
                type='number'
                onChange={()=>setMyFiles({type:'set_beg', payload:Number(beg_input_ref.current.value), filenumber:file_no})}
            // the Number() converts it to a number , int so that i can perform check of 0 in the check_before_search function
            ></input>

            <p className={styles.split_input_box_text}>to</p>

            <input 
                className={styles.split_input_box_input} 
                title='set last page'
                type='number'
                ref={end_input_ref}
                onChange={()=>setMyFiles({type:'set_end', payload:Number(end_input_ref.current.value), filenumber:file_no})}
            // the Number() converts it to a number , int so that i can perform check of 0 in the check_before_search function
            ></input>
        </div>
    )
}

const Column3 = ({myFiles})=>{ // renders when the pdfs are ready
    console.log('reached here');
    console.log(myFiles.urls);
    return(
        <div className={styles.column3_container}>
        {/*this is the section which displays all idividual links for pdfs splitted*/}
            {myFiles.urls.map((item,index)=><IndividualFile_Column3 key={index} url={item} index={index}/>)}
        </div>
    )
}

const IndividualFile_Column3=({url,index})=>{
    console.log('individual column 3')
    return(
        <div className={styles.downloadbox_box}>
        {/*this is the container for a single pdf download sections*/}
            <p className={styles.downloadbox_para}>pdf {index+1} : </p>
            {/*index + 1 so that 0 does not show up lol*/}
            <a className={styles.downloadbox_link} href={url} title='download' target='_blank'>
            {/*target='_blank' so that it opens link in new tab , going back to my page messes it up*/}
            {/*this is the downlaod image and its link */}
                <img className={styles.downloadbox_img} src='/assets/dwnd.png'></img>
            </a>
        </div>
    )
}


export default SplitPage

//turns out that once a person has done splitting , if he/she adds another split section
//it still works , lessgo