<?php
/*
	##### 업데이트로그 #####
	20210601 김현중 신규
*/
?>
<div id='treegrid_container' style="height: 500px; padding: 20px 20px 0;"></div>
<div id="pagination" style="padding: 0 20px;"></div>
</br>
<button class='dhx_sample-btn--cta' onclick = 'save_data(<?php echo millisecond();?>);' >Save</button>
<button class='dhx_sample-btn--cta' onclick='addSpan();'>Add Row</button>
<button class='dhx_sample-btn--cta' onclick='collapseAll();'>Collapse All</button>
<button class='dhx_sample-btn--cta' onclick='expandAll();'>Expand All</button>
<div id='form' style='height: 50%; margin: 20px;' onchange='select_change(this);'></div>
