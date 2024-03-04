import logo from "./../logo.png"

function Header() {
    return (
        <>
        <div className="col12 d-flex justify-content-center mt-4">
            <img src={logo} width="60"className="mx-3"/>
            <h1 id="App-title" className="align-self-center">DICOM Viewer</h1>
        </div>
        </>
    );
}
  
export default Header;