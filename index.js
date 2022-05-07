class Node {
    constructor(actNum, actName, dur) {
        this.actNum = actNum;
        this.actName = actName;
        this.est = 0;
        this.eft = 0;
        this.lst = 0;
        this.lft = 0;
        this.duration = dur;
        this.cbt = 0;
        this.bt = 0;
        this.predecessor = [];
        this.successor = [];
    }
}


function UploadProcess() {
    var fileUpload = document.getElementById("fileUpload");

    var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xls|.xlsx)$/;
    if (regex.test(fileUpload.value.toLowerCase())) {
        if (typeof (FileReader) != "undefined") {
            var reader = new FileReader();

            reader.onload = function (e) {
                main(e.target.result);
            };
            reader.readAsBinaryString(fileUpload.files[0]);
            
        } else {
            alert("This browser does not support HTML5.");
        }
    } else {
        alert("Please upload a valid Excel file.");
    }
};

function main(data) {
    var workbook = XLSX.read(data, {
        type: 'binary'
    });

    var Sheet = workbook.SheetNames[0];

    var excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[Sheet]);

    
    var nodes = [];
    for (var i = 0; i < excelRows.length; i++) {
        var act_name = excelRows[i]["Activity Name"];
        var act_num = parseInt(excelRows[i]["Activity Number"]);
        var dur = parseInt(excelRows[i]["Duration in hours"]);
        var node = new Node(act_num, act_name, dur);
        nodes.push(node);
    }
    for (var i = 0; i < excelRows.length; i++) {
        var pre = excelRows[i]["Predecessor"];
        var succ = excelRows[i]["Successor"];
        if(pre != '-') {
            var temp = pre.split(',').map(x=>+x);
            for(var j = 0; j<temp.length; j++) {
                nodes[i].predecessor.push(nodes[temp[j]-1]);
            }
        }
        if(succ != '-') {
            var temp = succ.split(',').map(x=>+x);
            for(var j = 0; j<temp.length; j++) {
                nodes[i].successor.push(nodes[temp[j]-1]);
            }
        }
    }
    // console.log(nodes);

    var n = nodes.length;

    // calculating est and eft
    for(var i = 0; i<n; i++) {
        var mx = 0;
        var pred = nodes[i].predecessor;
        for(var j=0; j<pred.length; j++) {
            mx = Math.max(pred[j].eft, mx);
        } 
        nodes[i].est = mx;
        nodes[i].eft = nodes[i].duration + mx;
    }
    

    // calculating lst and lft
    nodes[n-1].lft = nodes[n-1].eft;
    nodes[n-1].lst = nodes[n-1].est;
    for(var i = n-2; i>=0; i--) {
        var mn = 100000;
        var succ = nodes[i].successor;
        for(var j=0; j<succ.length; j++) {
            mn = Math.min(succ[j].lst, mn);
        } 
        nodes[i].lft = mn;
        nodes[i].lst = mn - nodes[i].duration;
    }

    // calculating buffer times

    // calculating Cummulative buffer time
    for(var i=0; i<n; i++) {
        nodes[i].cbt = nodes[i].lst - nodes[i].est;
    }

    // calculating free buffer times
    for(var i=0; i<n-1; i++) {
        var mn = 100000;
        var succ = nodes[i].successor;
        for(var j=0; j<succ.length; j++) {
            mn = Math.min(succ[j].est, mn);
        }
        nodes[i].bt = mn - nodes[i].eft;
    }

    var criticalPath = [];
    criticalPath.push(nodes[0]);
    var i = 0;
    while(criticalPath[i].successor.length != 0) {
        var temp = criticalPath[i].successor;
        for(var j = 0; j<temp.length; j++) {
            if(temp[j].bt == 0 && temp[j].cbt == 0) {
                criticalPath.push(temp[j]);
                break;
            }
        }
        i++;
    }


    var tableData = graphData(nodes);
    var links = graphLink(nodes);
    init(tableData, links);

    console.log(criticalPath);

};

function graphData(nodes) {
    var n = nodes.length;
    var data = [];
    for(var i=0; i<n; i++) {
        var obj = {
            key: nodes[i].actNum, 
            text: nodes[i].actName, 
            length: nodes[i].duration, 
            earlyStart: nodes[i].est, 
            lateFinish: nodes[i].lft, 
            critical: nodes[i].cbt==0 ? true : false
        }
        data.push(obj);
    }
    return data;
}

function graphLink(nodes) {
    var links = [];
    for(var i=0; i<nodes.length; i++) {
        for(var j=0; j<nodes[i].successor.length; j++) {
            var obj = {
                from: nodes[i].actNum,
                to: nodes[i].successor[j].actNum
            }
            links.push(obj);
        }
        
    }
    return links;
}


function init(tableData, links) {

 
    const $ = go.GraphObject.make;  // for more concise visual tree definitions

    var blue = "#0288D1";
    var pink = "#B71C1C";
    var pinkfill = "#F8BBD0";
    var bluefill = "#B3E5FC";

    myDiagram =
      $(go.Diagram, "myDiagramDiv",
        {
          initialAutoScale: go.Diagram.Uniform,
          layout: $(go.LayeredDigraphLayout)
        });

    myDiagram.nodeTemplate =
      $(go.Node, "Auto",
        $(go.Shape, "Rectangle",  // the border
          { fill: "white", strokeWidth: 2 },
          new go.Binding("fill", "critical", b => b ? pinkfill : bluefill),
          new go.Binding("stroke", "critical", b => b ? pink : blue)),
        $(go.Panel, "Table",
          { padding: 0.5 },
          $(go.RowColumnDefinition, { column: 1, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { column: 2, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { row: 1, separatorStroke: "black", background: "white", coversSeparators: true }),
          $(go.RowColumnDefinition, { row: 2, separatorStroke: "black" }),
          $(go.TextBlock, // earlyStart
            new go.Binding("text", "earlyStart"),
            { row: 0, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock,
            new go.Binding("text", "length"),
            { row: 0, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock,  // earlyFinish
            new go.Binding("text", "",
              d => (d.earlyStart + d.length).toFixed(2)),
            { row: 0, column: 2, margin: 5, textAlign: "center" }),

          $(go.TextBlock,
            new go.Binding("text", "text"),
            {
              row: 1, column: 0, columnSpan: 3, margin: 5,
              textAlign: "center", font: "bold 14px sans-serif"
            }),

          $(go.TextBlock,  // lateStart
            new go.Binding("text", "",
              d => (d.lateFinish - d.length).toFixed(2)),
            { row: 2, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock,  // slack
            new go.Binding("text", "",
              d => (d.lateFinish - (d.earlyStart + d.length)).toFixed(2)),
            { row: 2, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock, // lateFinish
            new go.Binding("text", "lateFinish"),
            { row: 2, column: 2, margin: 5, textAlign: "center" })
        )  
      );  

    function linkColorConverter(linkdata, elt) {
      var link = elt.part;
      if (!link) return blue;
      var f = link.fromNode;
      if (!f || !f.data || !f.data.critical) return blue;
      var t = link.toNode;
      if (!t || !t.data || !t.data.critical) return blue;
      return pink; 
    }

    myDiagram.linkTemplate =
      $(go.Link,
        { toShortLength: 6, toEndSegmentLength: 20 },
        $(go.Shape,
          { strokeWidth: 4 },
          new go.Binding("stroke", "", linkColorConverter)),
        $(go.Shape,  // arrowhead
          { toArrow: "Triangle", stroke: null, scale: 1.5 },
          new go.Binding("fill", "", linkColorConverter))
      );

    myDiagram.model = new go.GraphLinksModel(tableData, links);

    // create an unbound Part that acts as a "legend" for the diagram
    myDiagram.add(
      $(go.Node, "Auto",
        $(go.Shape, "Rectangle",  // the border
          { fill: bluefill }),
        $(go.Panel, "Table",
          $(go.RowColumnDefinition, { column: 1, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { column: 2, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { row: 1, separatorStroke: "black", background: bluefill, coversSeparators: true }),
          $(go.RowColumnDefinition, { row: 2, separatorStroke: "black" }),
          $(go.TextBlock, "Early Start",
            { row: 0, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Duration",
            { row: 0, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Early Finish",
            { row: 0, column: 2, margin: 5, textAlign: "center" }),

          $(go.TextBlock, "Activity Name",
            {
              row: 1, column: 0, columnSpan: 3, margin: 5,
              textAlign: "center", font: "bold 14px sans-serif"
            }),

          $(go.TextBlock, "Late Start",
            { row: 2, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Cumulative Buffer Time",
            { row: 2, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Late Finish",
            { row: 2, column: 2, margin: 5, textAlign: "center" })
        )  
      ));
  }
