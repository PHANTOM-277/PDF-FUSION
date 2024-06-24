import React, { useReducer } from 'react'
import styles from './MergePage.module.css'
import { PDFDocument } from 'pdf-lib'
import {Link} from 'react-router-dom' //we're gonna give a link back to home page



const createBlob = async (pdfData) => {
    const blobdata = new Blob([pdfData], { type: 'application/pdf' });
    return blobdata;
};



//this function manages the merge functionality , payload[0] is a refernece to the iframe 
//and payload[1] is the reference to the anchor tag with download image
async function mergepdfs(pdfs, payload){
try{    
    var resultPDF = await PDFDocument.create(); //create new file
    var files_buffer_array = [];//will contain files in format usable by pdf-lib
    var pdf_loaded = [];//will hold all the files loaded by pdf-lib
    var i, j;//helps with loops
    for(i=0;i<pdfs.length;i++){//iterate for every file
        var arr= [];//for the page numbers to be copied
        files_buffer_array[i] = await pdfs[i].arrayBuffer(); // convert the file to readable array buffer
        pdf_loaded[i] = await PDFDocument.load(files_buffer_array[i]);//load the array buffer as a file in pdf-lib
        for(j=0;j<pdf_loaded[i].getPageCount();j++){//to get the array to pass when using Copy function
            arr[j]=j;
        }
        const copiedPages = await resultPDF.copyPages(pdf_loaded[i], arr);
        copiedPages.forEach((page) => {
            resultPDF.addPage(page);
        });
    }
    //save pdf
    var pdf_arraybufferdata = await resultPDF.save();
    // Convert the PDF data to a blob
    const blobdata = await createBlob(pdf_arraybufferdata);
    const url = URL.createObjectURL(blobdata);
    payload[0].current.src = url;//change the iframe's url
    payload[1].current.href = url;//change the download icon's href
    }
catch(error){
    console.log(error);
    }
}


//reducer function
// the myFiles variable has a .data which is the file array itself , file_list with file names 
// and an isFile so that we dont face null map error
const File_Reducer = (state,action)=>{
    switch(action.type){
        case 'Input_changed'://handles the case when more files added
            var file_Array = Array.from(action.payload);
            var new_list = file_Array.map((item)=>{return item.name});

            //the if statement lets user use the input multiple times
            if(state.file_list){
                new_list = [...state.file_list ,  ...new_list];
                file_Array = [...state.data, ...file_Array];//spread operators 
            }

            return {
                ...state,
                data: file_Array,
                file_list : new_list,
                isFile: true
            }

        case 'Merge': //handles the case when the merge button is clicked
            console.log('Merge');
            if (state.isFile) {
                mergepdfs(state.data, action.payload);
                return state;
            }
            else{
                alert('no files selected');
                return state;
            }
        
        case 'Remove'://handles the case when we have to delete a file that is loaded
            var new_data = state.data.filter((item,index)=>index!==action.payload);//remove one element starting from action.payload index
            var new_namelist = state.file_list.filter((item,index)=>index!==action.payload);// remove one element starting from action.payload index
            if(!new_namelist.length){
                return {...state,
                    data: new_data,
                    file_list: new_namelist,
                    isFile: false
                }
            }
            else{
                return {...state,
                    data: new_data,
                    file_list: new_namelist
                }
            }
        
        case 'Move_up'://handles the case when a user wants to move a file up
            if(action.payload===0){//cannot move up i.e its the first file
                return state;
            }
            else{
                var temp = action.payload;//the index of the box clicked
                var newdata = [...state.data];//the actual files and using spread to create a separate copy(avoiding reference to original array)
                var newfilenames = [...state.file_list];
                [newdata[temp-1], newdata[temp]] = [newdata[temp], newdata[temp-1]];//interchange
                [newfilenames[temp-1], newfilenames[temp]] = [newfilenames[temp], newfilenames[temp-1]];
                return {...state,
                    data:newdata,
                    file_list : newfilenames
                };
            }

        case 'Move_down'://handles the case when user wants to move a file down
            if(action.payload+1 === state.data.length){//the case when you cannot move down i.e this is the last file
                return state;
            }
            else{
                var temp = action.payload;//the index of the box clicked
                var newdata = [...state.data];//the actual files and using spread to create a separate copy
                var newfilenames = [...state.file_list];
                [newdata[temp+1], newdata[temp]] = [newdata[temp], newdata[temp+1]];//interchange
                [newfilenames[temp+1], newfilenames[temp]] = [newfilenames[temp], newfilenames[temp+1]];
                return {...state,
                    data:newdata,
                    file_list : newfilenames
                };
            }
            
    }
}


//this is the main React Component of the /merge page
const MergePage = ()=>{
    const [myFiles, setMyFiles] = React.useReducer(File_Reducer, 
        {
            data: [],
            file_list: [],
            isFile: false,
            isMerged: false,
            url: ''
        }
    );//this is used to handle everything file related , see the reducer function above to understand

    const inputRef = React.useRef();//so that we can send the files using .current.files
    const iframeRef = React.useRef();//so that we can set iframe href in merge function
    const dwndRef = React.useRef();//so that we can set the anchor tags href

    return(
        <div className={styles.main}> {/*classname main */}   
            {/*use link tag for home btn */}   
            <Link to='/' title='home-page' className={styles.home}>
                <img src='/assets/home3.png' alt='homebtn' className={styles.home_img}></img>{/*classname : home_img */}
            </Link>
            <p className={styles.title}>PDF-MERGE</p>{/*classname: title */}
            
            <div className={styles.input_area}>
                <input 
                    ref={inputRef}
                    className={styles.myinput}
                    type='file' 
                    accept='.pdf' 
                    onChange={()=>setMyFiles({type:'Input_changed', payload:inputRef.current.files })}
                    multiple>
                </input>
                {/*Set all files based on list */}
                <div className={styles.uploaded_files}>
                    {myFiles.isFile && myFiles.file_list.map((item,index)=> 
                        <Individual_File 
                            key={`${item}-${index}`} 
                            item={item}
                            index={index}
                            clickHandler={setMyFiles} 
                        />
                    )}
                </div>
                <button 
                className={styles.merge_btn}
                onClick={()=>setMyFiles({type:'Merge', payload:[iframeRef,dwndRef]})}
                >
                    Merge
                </button>
            </div>{/*classname:input_area*/}
            
            <div className={styles.iframe_area}>
                <My_Iframe refer={iframeRef}/>
            </div>{/*classname: iframe_area */}
            <a href='#' className={styles.dwnd_btn} ref={dwndRef}  target="_blank">
                <img src='/assets/dwnd.png' alt='download_btn'className={styles.dwnd_btn_img}></img> {/*dwnd_btn */}           
            </a>
        </div>
    )
}


//the ifram component , refer is the reference using 'useRef()' so that we can set its src when pdfs are merged 
const My_Iframe = ({refer})=>{
    return(
        <>
            <iframe 
                ref={refer} 
                className={styles.my_iframe}
            ></iframe>
        </>
    )
}

//the individual file component 
const Individual_File = (props)=>{
    return(
        <div className={styles.files_btn}>{/*this is one individual file reperesentation */}
            <p className={styles.files_text}>{props.item}</p> {/*name of the file */}
            <div className={styles.move_btns_container}>{/*has the up and down button */}
                <button 
                    className={styles.move_btns} 
                    title='move-up'
                    onClick={()=>props.clickHandler({type:'Move_up', payload:props.index})}>
                    <img className={styles.move_btns_img} src='/assets/up.png'></img>
                </button>
                <button 
                    className={styles.move_btns} 
                    title='move-down'
                    onClick={()=>props.clickHandler({type:'Move_down', payload:props.index})}>
                    <img className={styles.move_btns_img} src='/assets/down.png'></img>
                </button>
            </div>
            <button 
                className={styles.trash_btn}
                title='remove'
                onClick={()=>props.clickHandler({type:'Remove', payload:props.index})}//arrow function so that we dont call it immediately
                >{/*trash button to delete a laoded file */}
                <img className={styles.trash_img}src='/assets/trash.png'></img>
            </button>
        </div>
    )
}

export default MergePage //now you need not use {} while importing it

